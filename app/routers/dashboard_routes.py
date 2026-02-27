from datetime import date, timedelta
from calendar import monthrange
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, DailyPlan, Task, WeeklyReview, Transaction, Debt,
    Account, HealthMetric, Exercise, Habit, HabitLog,
    TaskPriority, TaskStatus, TransactionType
)
from app.auth import get_current_user

router = APIRouter(tags=["Dashboard"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    from app.auth import get_optional_user
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        user = get_optional_user(request, db)
        if user:
            return HTMLResponse(status_code=303, headers={"Location": "/dashboard"})
        return templates.TemplateResponse("auth/login.html", {
            "request": request, "error": None
        })
    finally:
        db.close()


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_start = date(today.year, today.month, 1)
    _, dim = monthrange(today.year, today.month)
    month_end = date(today.year, today.month, dim)

    # ─── PLOS Metrics ──────────────────────
    today_tasks = db.query(Task).filter(
        Task.user_id == user.id,
        Task.plan_date == today,
    ).all()
    today_total = len(today_tasks)
    today_done = len([t for t in today_tasks if t.status == TaskStatus.DONE])
    today_must = [t for t in today_tasks if t.priority == TaskPriority.MUST]
    today_must_done = len([t for t in today_must if t.status == TaskStatus.DONE])

    today_plan = db.query(DailyPlan).filter(
        DailyPlan.user_id == user.id,
        DailyPlan.plan_date == today,
    ).first()

    # Latest weekly review
    latest_review = db.query(WeeklyReview).filter(
        WeeklyReview.user_id == user.id,
    ).order_by(WeeklyReview.week_start.desc()).first()

    # ─── Financial Metrics ─────────────────
    monthly_income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == TransactionType.INCOME,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).scalar()

    monthly_expenses = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == user.id,
        Transaction.transaction_type == TransactionType.EXPENSE,
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).scalar()

    monthly_net = monthly_income - monthly_expenses

    total_debt = db.query(func.coalesce(func.sum(Debt.current_balance), 0)).filter(
        Debt.user_id == user.id,
        Debt.is_active == True,
    ).scalar()

    total_balance = db.query(func.coalesce(func.sum(Account.balance), 0)).filter(
        Account.user_id == user.id,
        Account.is_active == True,
    ).scalar()

    net_worth = total_balance - total_debt

    # ─── Health Metrics ────────────────────
    latest_health = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id,
    ).order_by(HealthMetric.metric_date.desc()).first()

    exercise_week = db.query(func.coalesce(func.sum(Exercise.duration_minutes), 0)).filter(
        Exercise.user_id == user.id,
        Exercise.exercise_date >= week_ago,
    ).scalar()

    habits = db.query(Habit).filter(
        Habit.user_id == user.id, Habit.is_active == True
    ).all()
    habits_done_today = 0
    for h in habits:
        log = db.query(HabitLog).filter(
            HabitLog.habit_id == h.id,
            HabitLog.log_date == today,
            HabitLog.completed == True,
        ).first()
        if log:
            habits_done_today += 1

    bmi = None
    if latest_health and latest_health.weight_kg and user.height_m:
        bmi = round(latest_health.weight_kg / (user.height_m ** 2), 1)

    # ─── Master Scores ─────────────────────
    # Execution score
    exec_score = round((today_done / max(today_total, 1)) * 100)

    # Financial health (simple: net > 0 = good)
    fin_score = 50
    if monthly_net > 0:
        fin_score = min(100, 50 + int(monthly_net / max(monthly_income, 1) * 50))
    elif monthly_income > 0:
        fin_score = max(0, int((1 - abs(monthly_net) / monthly_income) * 50))

    # Health score
    health_score = 50
    if latest_health:
        if latest_health.glucose_fasting and latest_health.glucose_fasting < 130:
            health_score += 15
        if latest_health.sleep_hours and 7 <= latest_health.sleep_hours <= 9:
            health_score += 10
    if exercise_week >= 150:
        health_score += 15
    elif exercise_week >= 90:
        health_score += 10
    if bmi and bmi < 30:
        health_score += 10
    health_score = min(health_score, 100)

    # Overall
    overall_score = round(exec_score * 0.35 + fin_score * 0.35 + health_score * 0.30)

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "today": today,
        # PLOS
        "today_total": today_total,
        "today_done": today_done,
        "today_must": len(today_must),
        "today_must_done": today_must_done,
        "today_plan": today_plan,
        "latest_review": latest_review,
        "exec_score": exec_score,
        # Financial
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "monthly_net": monthly_net,
        "total_debt": total_debt,
        "total_balance": total_balance,
        "net_worth": net_worth,
        "fin_score": fin_score,
        # Health
        "latest_health": latest_health,
        "bmi": bmi,
        "exercise_week": exercise_week,
        "total_habits": len(habits),
        "habits_done": habits_done_today,
        "health_score": health_score,
        # Master
        "overall_score": overall_score,
    })
