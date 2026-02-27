import math
from datetime import date, timedelta
from calendar import monthrange
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models import (
    User, Account, Transaction, Debt, DebtPayment, Budget,
    TransactionType, DebtType, DebtStrategy
)
from app.auth import get_current_user

router = APIRouter(prefix="/financial", tags=["Financial"])
templates = Jinja2Templates(directory="app/templates")

EXPENSE_CATEGORIES = [
    "Vivienda", "Alimentacion", "Transporte", "Salud", "Educacion",
    "Entretenimiento", "Ropa", "Servicios", "Seguros", "Deuda",
    "Ahorro", "Otros"
]

INCOME_CATEGORIES = [
    "Salario", "Freelance", "Inversiones", "Negocio", "Renta", "Otros"
]


@router.get("/overview", response_class=HTMLResponse)
async def financial_overview(
    request: Request,
    month: int = None,
    year: int = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    m = month or today.month
    y = year or today.year
    _, days_in_month = monthrange(y, m)
    month_start = date(y, m, 1)
    month_end = date(y, m, days_in_month)

    # Income this month
    income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == TransactionType.INCOME,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).scalar()

    # Expenses this month
    expenses = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == TransactionType.EXPENSE,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).scalar()

    # Expenses by category
    expense_by_cat = db.query(
        Transaction.category,
        func.sum(Transaction.amount)
    ).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == TransactionType.EXPENSE,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).group_by(Transaction.category).all()

    # Net
    net = income - expenses

    # Accounts
    accounts = db.query(Account).filter(
        Account.user_id == user.id, Account.is_active == True
    ).all()
    total_balance = sum(a.balance for a in accounts)

    # Debts
    debts = db.query(Debt).filter(
        Debt.user_id == user.id, Debt.is_active == True
    ).all()
    total_debt = sum(d.current_balance for d in debts)

    # Net worth
    net_worth = total_balance - total_debt

    # Budgets
    budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.month == m,
        Budget.year == y,
    ).all()

    budget_status = []
    for b in budgets:
        spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user.id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.category == b.category,
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end,
        ).scalar()
        pct = round((spent / b.monthly_limit * 100) if b.monthly_limit > 0 else 0)
        budget_status.append({
            "category": b.category,
            "limit": b.monthly_limit,
            "spent": spent,
            "remaining": b.monthly_limit - spent,
            "pct": min(pct, 100),
            "over": spent > b.monthly_limit,
        })

    # Monthly trend (last 6 months)
    trend = []
    for i in range(5, -1, -1):
        tm = m - i
        ty = y
        while tm <= 0:
            tm += 12
            ty -= 1
        _, dim = monthrange(ty, tm)
        ms = date(ty, tm, 1)
        me = date(ty, tm, dim)
        ti = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user.id,
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        ).scalar()
        te = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user.id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        ).scalar()
        trend.append({"month": f"{ty}-{tm:02d}", "income": ti, "expenses": te, "net": ti - te})

    # Navigation
    prev_m, prev_y = (m - 1, y) if m > 1 else (12, y - 1)
    next_m, next_y = (m + 1, y) if m < 12 else (1, y + 1)

    return templates.TemplateResponse("financial/overview.html", {
        "request": request,
        "user": user,
        "month": m,
        "year": y,
        "income": income,
        "expenses": expenses,
        "net": net,
        "expense_by_cat": expense_by_cat,
        "accounts": accounts,
        "total_balance": total_balance,
        "debts": debts,
        "total_debt": total_debt,
        "net_worth": net_worth,
        "budget_status": budget_status,
        "trend": trend,
        "expense_categories": EXPENSE_CATEGORIES,
        "income_categories": INCOME_CATEGORIES,
        "prev_month": prev_m,
        "prev_year": prev_y,
        "next_month": next_m,
        "next_year": next_y,
    })


# ─── Transactions ────────────────────────────────────────

@router.get("/transactions", response_class=HTMLResponse)
async def transactions_page(
    request: Request,
    month: int = None,
    year: int = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    m = month or today.month
    y = year or today.year
    _, days_in_month = monthrange(y, m)
    month_start = date(y, m, 1)
    month_end = date(y, m, days_in_month)

    transactions = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).order_by(Transaction.transaction_date.desc()).all()

    accounts = db.query(Account).filter(
        Account.user_id == user.id, Account.is_active == True
    ).all()

    prev_m, prev_y = (m - 1, y) if m > 1 else (12, y - 1)
    next_m, next_y = (m + 1, y) if m < 12 else (1, y + 1)

    return templates.TemplateResponse("financial/transactions.html", {
        "request": request,
        "user": user,
        "month": m,
        "year": y,
        "transactions": transactions,
        "accounts": accounts,
        "expense_categories": EXPENSE_CATEGORIES,
        "income_categories": INCOME_CATEGORIES,
        "prev_month": prev_m,
        "prev_year": prev_y,
        "next_month": next_m,
        "next_year": next_y,
    })


@router.post("/transaction/add")
async def add_transaction(
    request: Request,
    transaction_type: str = Form(...),
    amount: float = Form(...),
    category: str = Form(...),
    subcategory: str = Form(""),
    description: str = Form(""),
    transaction_date: str = Form(...),
    account_id: int = Form(None),
    is_recurring: bool = Form(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = Transaction(
        user_id=user.id,
        account_id=account_id if account_id else None,
        transaction_type=TransactionType(transaction_type),
        amount=amount,
        category=category,
        subcategory=subcategory,
        description=description,
        transaction_date=date.fromisoformat(transaction_date),
        is_recurring=is_recurring,
    )
    db.add(t)

    # Update account balance
    if account_id:
        acct = db.query(Account).filter(Account.id == account_id).first()
        if acct:
            if transaction_type == "income":
                acct.balance += amount
            elif transaction_type == "expense":
                acct.balance -= amount

    db.commit()
    d = date.fromisoformat(transaction_date)
    return RedirectResponse(
        url=f"/financial/transactions?month={d.month}&year={d.year}",
        status_code=303
    )


@router.post("/transaction/{txn_id}/delete")
async def delete_transaction(
    txn_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(
        Transaction.id == txn_id, Transaction.user_id == user.id
    ).first()
    if txn:
        # Reverse account balance
        if txn.account_id:
            acct = db.query(Account).filter(Account.id == txn.account_id).first()
            if acct:
                if txn.transaction_type == TransactionType.INCOME:
                    acct.balance -= txn.amount
                elif txn.transaction_type == TransactionType.EXPENSE:
                    acct.balance += txn.amount
        db.delete(txn)
        db.commit()
    return RedirectResponse(url="/financial/transactions", status_code=303)


# ─── Accounts ────────────────────────────────────────────

@router.post("/account/add")
async def add_account(
    request: Request,
    name: str = Form(...),
    account_type: str = Form("checking"),
    balance: float = Form(0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct = Account(
        user_id=user.id,
        name=name,
        account_type=account_type,
        balance=balance,
    )
    db.add(acct)
    db.commit()
    return RedirectResponse(url="/financial/overview", status_code=303)


# ─── Debts ───────────────────────────────────────────────

@router.get("/debts", response_class=HTMLResponse)
async def debts_page(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debts = db.query(Debt).filter(
        Debt.user_id == user.id, Debt.is_active == True
    ).order_by(Debt.interest_rate.desc()).all()

    total_debt = sum(d.current_balance for d in debts)
    total_min_payment = sum(d.minimum_payment for d in debts)
    avg_rate = sum(d.interest_rate * d.current_balance for d in debts) / max(total_debt, 1)

    # Payment history
    for d in debts:
        d.recent_payments = db.query(DebtPayment).filter(
            DebtPayment.debt_id == d.id
        ).order_by(DebtPayment.payment_date.desc()).limit(5).all()
        # Months to payoff at minimum
        if d.minimum_payment > 0 and d.interest_rate > 0:
            monthly_rate = d.interest_rate / 100 / 12
            if d.minimum_payment > d.current_balance * monthly_rate:
                import math
                d.months_to_payoff = math.ceil(
                    -math.log(1 - (d.current_balance * monthly_rate / d.minimum_payment))
                    / math.log(1 + monthly_rate)
                )
            else:
                d.months_to_payoff = None  # won't pay off at minimum
        else:
            d.months_to_payoff = (
                math.ceil(d.current_balance / d.minimum_payment)
                if d.minimum_payment > 0 else None
            )

    return templates.TemplateResponse("financial/debts.html", {
        "request": request,
        "user": user,
        "debts": debts,
        "total_debt": total_debt,
        "total_min_payment": total_min_payment,
        "avg_rate": round(avg_rate, 1),
    })


@router.post("/debt/add")
async def add_debt(
    request: Request,
    name: str = Form(...),
    debt_type: str = Form("other"),
    original_amount: float = Form(...),
    current_balance: float = Form(...),
    interest_rate: float = Form(...),
    minimum_payment: float = Form(...),
    due_day: int = Form(None),
    strategy: str = Form("avalanche"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debt = Debt(
        user_id=user.id,
        name=name,
        debt_type=DebtType(debt_type),
        original_amount=original_amount,
        current_balance=current_balance,
        interest_rate=interest_rate,
        minimum_payment=minimum_payment,
        due_day=due_day,
        strategy=DebtStrategy(strategy),
        start_date=date.today(),
    )
    db.add(debt)
    db.commit()
    return RedirectResponse(url="/financial/debts", status_code=303)


@router.post("/debt/{debt_id}/payment")
async def add_debt_payment(
    debt_id: int,
    amount: float = Form(...),
    payment_date: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    debt = db.query(Debt).filter(Debt.id == debt_id, Debt.user_id == user.id).first()
    if debt:
        debt.current_balance = max(0, debt.current_balance - amount)
        if debt.current_balance == 0:
            debt.is_active = False

        payment = DebtPayment(
            debt_id=debt_id,
            amount=amount,
            payment_date=date.fromisoformat(payment_date),
            balance_after=debt.current_balance,
        )
        db.add(payment)
        db.commit()
    return RedirectResponse(url="/financial/debts", status_code=303)


# ─── Budgets ─────────────────────────────────────────────

@router.post("/budget/add")
async def add_budget(
    request: Request,
    category: str = Form(...),
    monthly_limit: float = Form(...),
    month: int = Form(...),
    year: int = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.category == category,
        Budget.month == month,
        Budget.year == year,
    ).first()

    if existing:
        existing.monthly_limit = monthly_limit
    else:
        b = Budget(
            user_id=user.id,
            category=category,
            monthly_limit=monthly_limit,
            month=month,
            year=year,
        )
        db.add(b)
    db.commit()
    return RedirectResponse(
        url=f"/financial/overview?month={month}&year={year}",
        status_code=303
    )
