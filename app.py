"""
WUBI Financial Model - Web Application
Flask app that lets users configure assumptions, preview results,
pay via Stripe, and download a custom Excel financial model.
"""

import os
import json

from flask import (
    Flask, render_template, request, redirect, url_for,
    send_file, session, flash,
)
import stripe

from wubi_financial_model import (
    DEFAULT_PARAMS, create_wubi_model_bytes, compute_preview,
)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

# Stripe configuration
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")  # one-time price
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Price displayed to users (in your currency)
DISPLAY_PRICE = os.environ.get("DISPLAY_PRICE", "$9.99 USD")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PARAM_FIELDS = {
    "price_pro": ("Plan Pro price (MXN/mo)", "number", 149),
    "price_proplus": ("Plan Pro+ price (MXN/mo)", "number", 249),
    "price_family": ("Plan Family price (MXN/mo)", "number", 399),
    "margin_pro": ("Margin Pro (%)", "percent", 84),
    "margin_proplus": ("Margin Pro+ (%)", "percent", 86),
    "margin_family": ("Margin Family (%)", "percent", 88),
    "cac_pro": ("CAC Pro (MXN)", "number", 300),
    "cac_proplus": ("CAC Pro+ (MXN)", "number", 350),
    "cac_family": ("CAC Family (MXN)", "number", 400),
    "churn_pro": ("Churn Pro (%/mo)", "percent", 4),
    "churn_proplus": ("Churn Pro+ (%/mo)", "percent", 3),
    "churn_family": ("Churn Family (%/mo)", "percent", 2),
    "fixed_cost_1_6": ("Fixed costs M1-6 (MXN)", "number", 6000),
    "fixed_cost_7_12": ("Fixed costs M7-12 (MXN)", "number", 8000),
    "fixed_cost_13_24": ("Fixed costs M13-24 (MXN)", "number", 20000),
    "new_pro_1_6": ("New Pro users M1-6", "number", 25),
    "new_pro_7_12": ("New Pro users M7-12", "number", 50),
    "new_pro_13_24": ("New Pro users M13-24", "number", 100),
    "new_proplus_1_6": ("New Pro+ users M1-6", "number", 5),
    "new_proplus_7_12": ("New Pro+ users M7-12", "number", 15),
    "new_proplus_13_24": ("New Pro+ users M13-24", "number", 30),
    "new_family_1_6": ("New Family users M1-6", "number", 2),
    "new_family_7_12": ("New Family users M7-12", "number", 5),
    "new_family_13_24": ("New Family users M13-24", "number", 20),
}


def parse_params_from_form(form):
    """Extract model parameters from a submitted form."""
    params = {}
    for key, (_, field_type, _) in PARAM_FIELDS.items():
        raw = form.get(key)
        if raw is None or raw == "":
            continue
        val = float(raw)
        if field_type == "percent":
            val = val / 100.0
        params[key] = val
    return params


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Landing page with the assumptions form."""
    return render_template(
        "index.html",
        param_fields=PARAM_FIELDS,
        display_price=DISPLAY_PRICE,
    )


@app.route("/preview", methods=["POST"])
def preview():
    """Show a free preview of key metrics, with a pay button for full download."""
    params = parse_params_from_form(request.form)
    preview_data = compute_preview(params)

    # Store params in session for download after payment
    session["model_params"] = params

    return render_template(
        "preview.html",
        params=params,
        param_fields=PARAM_FIELDS,
        preview=preview_data,
        display_price=DISPLAY_PRICE,
        stripe_key=STRIPE_PUBLISHABLE_KEY,
    )


@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    """Create a Stripe Checkout session and redirect."""
    if not stripe.api_key or not STRIPE_PRICE_ID:
        # Demo mode: skip payment, go straight to download
        session["paid"] = True
        return redirect(url_for("success"))

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            mode="payment",
            success_url=request.host_url + "success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=request.host_url + "preview-cancel",
        )
        return redirect(checkout_session.url, code=303)
    except stripe.error.StripeError as e:
        flash(f"Payment error: {e.user_message}", "error")
        return redirect(url_for("index"))


@app.route("/success")
def success():
    """Post-payment page with download button."""
    stripe_session_id = request.args.get("session_id")

    # Verify payment with Stripe (if not in demo mode)
    if stripe_session_id and stripe.api_key:
        try:
            sess = stripe.checkout.Session.retrieve(stripe_session_id)
            if sess.payment_status == "paid":
                session["paid"] = True
        except stripe.error.StripeError:
            pass

    if not session.get("paid"):
        flash("Payment not confirmed. Please try again.", "error")
        return redirect(url_for("index"))

    return render_template("success.html")


@app.route("/download")
def download():
    """Generate and serve the Excel file."""
    if not session.get("paid"):
        flash("Please complete payment first.", "error")
        return redirect(url_for("index"))

    params = session.get("model_params", {})
    excel_bytes = create_wubi_model_bytes(params)

    # Clear the paid flag so the session can't be reused for free
    session.pop("paid", None)

    return send_file(
        excel_bytes,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="WUBI_Financial_Model.xlsx",
    )


@app.route("/preview-cancel")
def preview_cancel():
    """User cancelled Stripe checkout."""
    flash("Payment cancelled. Your assumptions are still saved - try again when ready.", "info")
    return redirect(url_for("index"))


@app.route("/webhook", methods=["POST"])
def stripe_webhook():
    """Handle Stripe webhook events (optional, for production reliability)."""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get("Stripe-Signature")

    if not STRIPE_WEBHOOK_SECRET:
        return "No webhook secret configured", 200

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return "Invalid signature", 400

    if event["type"] == "checkout.session.completed":
        # Could store in DB for audit, send email, etc.
        pass

    return "OK", 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
