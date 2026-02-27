from datetime import date, timedelta
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, HealthMetric, Exercise, Habit, HabitLog, ExerciseType
)
from app.auth import get_current_user

router = APIRouter(prefix="/health", tags=["Health"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/overview", response_class=HTMLResponse)
async def health_overview(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Latest metrics
    latest = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id
    ).order_by(HealthMetric.metric_date.desc()).first()

    # Weight trend (last 30 days)
    weight_trend = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id,
        HealthMetric.metric_date >= month_ago,
        HealthMetric.weight_kg.isnot(None),
    ).order_by(HealthMetric.metric_date).all()

    # Glucose trend
    glucose_trend = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id,
        HealthMetric.metric_date >= month_ago,
        HealthMetric.glucose_fasting.isnot(None),
    ).order_by(HealthMetric.metric_date).all()

    # Exercise this week
    exercises_week = db.query(Exercise).filter(
        Exercise.user_id == user.id,
        Exercise.exercise_date >= week_ago,
    ).all()
    total_minutes = sum(e.duration_minutes for e in exercises_week)

    # Exercise by type this month
    exercise_by_type = db.query(
        Exercise.exercise_type,
        func.sum(Exercise.duration_minutes)
    ).filter(
        Exercise.user_id == user.id,
        Exercise.exercise_date >= month_ago,
    ).group_by(Exercise.exercise_type).all()

    # Active habits
    habits = db.query(Habit).filter(
        Habit.user_id == user.id, Habit.is_active == True
    ).all()

    # Habit completion today
    habit_status = []
    for h in habits:
        log = db.query(HabitLog).filter(
            HabitLog.habit_id == h.id,
            HabitLog.log_date == today,
        ).first()
        # Streak
        streak = 0
        check_date = today
        while True:
            l = db.query(HabitLog).filter(
                HabitLog.habit_id == h.id,
                HabitLog.log_date == check_date,
                HabitLog.completed == True,
            ).first()
            if l:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        habit_status.append({
            "habit": h,
            "done_today": log.completed if log else False,
            "streak": streak,
        })

    # BMI calculation
    bmi = None
    if latest and latest.weight_kg and user.height_m:
        bmi = round(latest.weight_kg / (user.height_m ** 2), 1)

    # Health score
    health_score = _calculate_health_score(latest, bmi, total_minutes, habit_status)

    return templates.TemplateResponse("health/overview.html", {
        "request": request,
        "user": user,
        "latest": latest,
        "bmi": bmi,
        "weight_trend": weight_trend,
        "glucose_trend": glucose_trend,
        "exercises_week": exercises_week,
        "total_minutes_week": total_minutes,
        "exercise_by_type": exercise_by_type,
        "habit_status": habit_status,
        "health_score": health_score,
    })


def _calculate_health_score(latest, bmi, exercise_minutes, habit_status):
    score = 50  # base
    if latest:
        # Glucose (target: fasting < 130 mg/dL)
        if latest.glucose_fasting:
            if latest.glucose_fasting < 100:
                score += 15
            elif latest.glucose_fasting < 130:
                score += 10
            elif latest.glucose_fasting < 180:
                score += 5

        # Sleep (target: 7-8 hours)
        if latest.sleep_hours:
            if 7 <= latest.sleep_hours <= 9:
                score += 10
            elif 6 <= latest.sleep_hours < 7:
                score += 5

    # BMI (target: < 30)
    if bmi:
        if bmi < 25:
            score += 15
        elif bmi < 30:
            score += 10
        elif bmi < 35:
            score += 5

    # Exercise (target: 150 min/week)
    if exercise_minutes >= 150:
        score += 15
    elif exercise_minutes >= 90:
        score += 10
    elif exercise_minutes >= 30:
        score += 5

    # Habit completion
    if habit_status:
        done = sum(1 for h in habit_status if h["done_today"])
        total = len(habit_status)
        if total > 0:
            pct = done / total
            score += round(pct * 10)

    return min(score, 100)


# ─── Metrics ─────────────────────────────────────────────

@router.get("/metrics", response_class=HTMLResponse)
async def metrics_page(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metrics = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id
    ).order_by(HealthMetric.metric_date.desc()).limit(30).all()

    return templates.TemplateResponse("health/metrics.html", {
        "request": request,
        "user": user,
        "metrics": metrics,
    })


@router.post("/metric/add")
async def add_metric(
    request: Request,
    metric_date: str = Form(...),
    weight_kg: float = Form(None),
    waist_cm: float = Form(None),
    glucose_fasting: float = Form(None),
    glucose_post_meal: float = Form(None),
    blood_pressure_sys: int = Form(None),
    blood_pressure_dia: int = Form(None),
    hba1c: float = Form(None),
    sleep_hours: float = Form(None),
    sleep_quality: int = Form(None),
    stress_level: int = Form(None),
    notes: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = date.fromisoformat(metric_date)

    existing = db.query(HealthMetric).filter(
        HealthMetric.user_id == user.id,
        HealthMetric.metric_date == d,
    ).first()

    if existing:
        if weight_kg is not None:
            existing.weight_kg = weight_kg
        if waist_cm is not None:
            existing.waist_cm = waist_cm
        if glucose_fasting is not None:
            existing.glucose_fasting = glucose_fasting
        if glucose_post_meal is not None:
            existing.glucose_post_meal = glucose_post_meal
        if blood_pressure_sys is not None:
            existing.blood_pressure_sys = blood_pressure_sys
        if blood_pressure_dia is not None:
            existing.blood_pressure_dia = blood_pressure_dia
        if hba1c is not None:
            existing.hba1c = hba1c
        if sleep_hours is not None:
            existing.sleep_hours = sleep_hours
        if sleep_quality is not None:
            existing.sleep_quality = sleep_quality
        if stress_level is not None:
            existing.stress_level = stress_level
        if notes:
            existing.notes = notes
    else:
        metric = HealthMetric(
            user_id=user.id,
            metric_date=d,
            weight_kg=weight_kg,
            waist_cm=waist_cm,
            glucose_fasting=glucose_fasting,
            glucose_post_meal=glucose_post_meal,
            blood_pressure_sys=blood_pressure_sys,
            blood_pressure_dia=blood_pressure_dia,
            hba1c=hba1c,
            sleep_hours=sleep_hours,
            sleep_quality=sleep_quality,
            stress_level=stress_level,
            notes=notes,
        )
        db.add(metric)

    db.commit()
    return RedirectResponse(url="/health/metrics", status_code=303)


# ─── Exercise ────────────────────────────────────────────

@router.post("/exercise/add")
async def add_exercise(
    request: Request,
    exercise_date: str = Form(...),
    exercise_type: str = Form(...),
    duration_minutes: int = Form(...),
    intensity: int = Form(5),
    notes: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ex = Exercise(
        user_id=user.id,
        exercise_date=date.fromisoformat(exercise_date),
        exercise_type=ExerciseType(exercise_type),
        duration_minutes=duration_minutes,
        intensity=intensity,
        notes=notes,
    )
    db.add(ex)
    db.commit()
    return RedirectResponse(url="/health/overview", status_code=303)


# ─── Habits ──────────────────────────────────────────────

@router.get("/habits", response_class=HTMLResponse)
async def habits_page(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habits = db.query(Habit).filter(
        Habit.user_id == user.id
    ).all()

    today = date.today()
    for h in habits:
        h.today_log = db.query(HabitLog).filter(
            HabitLog.habit_id == h.id,
            HabitLog.log_date == today,
        ).first()
        # 7-day history
        h.week_history = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            log = db.query(HabitLog).filter(
                HabitLog.habit_id == h.id,
                HabitLog.log_date == d,
            ).first()
            h.week_history.append({
                "date": d,
                "completed": log.completed if log else False
            })

    return templates.TemplateResponse("health/habits.html", {
        "request": request,
        "user": user,
        "habits": habits,
        "today": today,
    })


@router.post("/habit/add")
async def add_habit(
    request: Request,
    name: str = Form(...),
    category: str = Form("health"),
    frequency: str = Form("daily"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = Habit(
        user_id=user.id,
        name=name,
        category=category,
        frequency=frequency,
    )
    db.add(habit)
    db.commit()
    return RedirectResponse(url="/health/habits", status_code=303)


@router.post("/habit/{habit_id}/toggle")
async def toggle_habit(
    habit_id: int,
    log_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = date.fromisoformat(log_date) if log_date else date.today()
    log = db.query(HabitLog).filter(
        HabitLog.habit_id == habit_id,
        HabitLog.user_id == user.id,
        HabitLog.log_date == d,
    ).first()

    if log:
        log.completed = not log.completed
    else:
        log = HabitLog(
            user_id=user.id,
            habit_id=habit_id,
            log_date=d,
            completed=True,
        )
        db.add(log)
    db.commit()
    return RedirectResponse(url="/health/habits", status_code=303)


@router.post("/habit/{habit_id}/delete")
async def delete_habit(
    habit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(
        Habit.id == habit_id, Habit.user_id == user.id
    ).first()
    if habit:
        db.delete(habit)
        db.commit()
    return RedirectResponse(url="/health/habits", status_code=303)
