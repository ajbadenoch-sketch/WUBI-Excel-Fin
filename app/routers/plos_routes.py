from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    User, DailyPlan, Task, WeeklyReview,
    TaskPriority, TaskStatus
)
from app.auth import get_current_user

router = APIRouter(prefix="/plos", tags=["PLOS"])
templates = Jinja2Templates(directory="app/templates")


# ─── Daily Planning ──────────────────────────────────────

@router.get("/daily", response_class=HTMLResponse)
async def daily_view(
    request: Request,
    target_date: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.fromisoformat(target_date) if target_date else date.today()
    plan = db.query(DailyPlan).filter(
        DailyPlan.user_id == user.id,
        DailyPlan.plan_date == today
    ).first()

    tasks = db.query(Task).filter(
        Task.user_id == user.id,
        Task.plan_date == today
    ).order_by(Task.priority).all()

    # Group tasks by priority
    grouped = {p: [] for p in TaskPriority}
    for t in tasks:
        grouped[t.priority].append(t)

    # Calculate daily score
    total = len(tasks)
    done = len([t for t in tasks if t.status == TaskStatus.DONE])
    must_tasks = [t for t in tasks if t.priority == TaskPriority.MUST]
    must_done = len([t for t in must_tasks if t.status == TaskStatus.DONE])

    score = 0
    if total > 0:
        # MUST tasks weigh 60%, others 40%
        must_score = (must_done / len(must_tasks) * 60) if must_tasks else 60
        other_score = ((done - must_done) / max(total - len(must_tasks), 1)) * 40
        score = round(must_score + other_score)

    return templates.TemplateResponse("plos/daily.html", {
        "request": request,
        "user": user,
        "today": today,
        "plan": plan,
        "grouped_tasks": grouped,
        "score": score,
        "total_tasks": total,
        "done_tasks": done,
        "prev_date": (today - timedelta(days=1)).isoformat(),
        "next_date": (today + timedelta(days=1)).isoformat(),
    })


@router.post("/daily/plan")
async def save_daily_plan(
    request: Request,
    plan_date: str = Form(...),
    top_priority: str = Form(""),
    energy_level: int = Form(5),
    mood_morning: int = Form(5),
    mood_evening: int = Form(None),
    stress_level: int = Form(5),
    notes: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = date.fromisoformat(plan_date)
    plan = db.query(DailyPlan).filter(
        DailyPlan.user_id == user.id,
        DailyPlan.plan_date == d
    ).first()

    if plan:
        plan.top_priority = top_priority
        plan.energy_level = energy_level
        plan.mood_morning = mood_morning
        if mood_evening is not None:
            plan.mood_evening = mood_evening
        plan.stress_level = stress_level
        plan.notes = notes
    else:
        plan = DailyPlan(
            user_id=user.id,
            plan_date=d,
            top_priority=top_priority,
            energy_level=energy_level,
            mood_morning=mood_morning,
            mood_evening=mood_evening,
            stress_level=stress_level,
            notes=notes,
        )
        db.add(plan)

    db.commit()
    return RedirectResponse(url=f"/plos/daily?target_date={plan_date}", status_code=303)


@router.post("/task/add")
async def add_task(
    request: Request,
    title: str = Form(...),
    priority: str = Form("should"),
    plan_date: str = Form(...),
    category: str = Form("personal"),
    estimated_minutes: int = Form(None),
    description: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = Task(
        user_id=user.id,
        title=title,
        description=description,
        priority=TaskPriority(priority),
        plan_date=date.fromisoformat(plan_date),
        category=category,
        estimated_minutes=estimated_minutes,
    )
    db.add(task)
    db.commit()
    return RedirectResponse(url=f"/plos/daily?target_date={plan_date}", status_code=303)


@router.post("/task/{task_id}/toggle")
async def toggle_task(
    task_id: int,
    plan_date: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if task:
        if task.status == TaskStatus.DONE:
            task.status = TaskStatus.PENDING
            task.completed_at = None
        else:
            task.status = TaskStatus.DONE
            task.completed_at = datetime.utcnow()
        db.commit()
    return RedirectResponse(url=f"/plos/daily?target_date={plan_date}", status_code=303)


@router.post("/task/{task_id}/defer")
async def defer_task(
    task_id: int,
    plan_date: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if task:
        # Move to next day
        next_day = task.plan_date + timedelta(days=1) if task.plan_date else date.today() + timedelta(days=1)
        task.plan_date = next_day
        task.status = TaskStatus.DEFERRED
        db.commit()
    return RedirectResponse(url=f"/plos/daily?target_date={plan_date}", status_code=303)


@router.post("/task/{task_id}/delete")
async def delete_task(
    task_id: int,
    plan_date: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if task:
        db.delete(task)
        db.commit()
    return RedirectResponse(url=f"/plos/daily?target_date={plan_date}", status_code=303)


# ─── Weekly Review ───────────────────────────────────────

@router.get("/weekly", response_class=HTMLResponse)
async def weekly_view(
    request: Request,
    week_start: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    if week_start:
        ws = date.fromisoformat(week_start)
    else:
        ws = today - timedelta(days=today.weekday())  # Monday
    we = ws + timedelta(days=6)

    # Get tasks for the week
    tasks = db.query(Task).filter(
        Task.user_id == user.id,
        Task.plan_date >= ws,
        Task.plan_date <= we,
    ).all()

    total = len(tasks)
    done = len([t for t in tasks if t.status == TaskStatus.DONE])
    must_tasks = [t for t in tasks if t.priority == TaskPriority.MUST]
    must_done = len([t for t in must_tasks if t.status == TaskStatus.DONE])

    # Get daily plans for mood/energy
    plans = db.query(DailyPlan).filter(
        DailyPlan.user_id == user.id,
        DailyPlan.plan_date >= ws,
        DailyPlan.plan_date <= we,
    ).all()

    avg_mood = sum(p.mood_morning or 5 for p in plans) / max(len(plans), 1)
    avg_energy = sum(p.energy_level or 5 for p in plans) / max(len(plans), 1)
    avg_stress = sum(p.stress_level or 5 for p in plans) / max(len(plans), 1)

    execution_score = round((done / max(total, 1)) * 100)
    must_pct = round((must_done / max(len(must_tasks), 1)) * 100)
    wellbeing_score = round(((avg_mood + avg_energy + (10 - avg_stress)) / 30) * 100)
    overall_score = round(execution_score * 0.6 + wellbeing_score * 0.4)

    # Existing review
    review = db.query(WeeklyReview).filter(
        WeeklyReview.user_id == user.id,
        WeeklyReview.week_start == ws,
    ).first()

    # Past reviews for trend
    past_reviews = db.query(WeeklyReview).filter(
        WeeklyReview.user_id == user.id,
    ).order_by(WeeklyReview.week_start.desc()).limit(8).all()

    return templates.TemplateResponse("plos/weekly.html", {
        "request": request,
        "user": user,
        "week_start": ws,
        "week_end": we,
        "total_tasks": total,
        "done_tasks": done,
        "must_pct": must_pct,
        "avg_mood": round(avg_mood, 1),
        "avg_energy": round(avg_energy, 1),
        "avg_stress": round(avg_stress, 1),
        "execution_score": execution_score,
        "wellbeing_score": wellbeing_score,
        "overall_score": overall_score,
        "review": review,
        "past_reviews": past_reviews,
        "prev_week": (ws - timedelta(days=7)).isoformat(),
        "next_week": (ws + timedelta(days=7)).isoformat(),
    })


@router.post("/weekly/save")
async def save_weekly_review(
    request: Request,
    week_start: str = Form(...),
    wins: str = Form(""),
    improvements: str = Form(""),
    next_week_focus: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ws = date.fromisoformat(week_start)
    we = ws + timedelta(days=6)

    # Calculate metrics
    tasks = db.query(Task).filter(
        Task.user_id == user.id,
        Task.plan_date >= ws,
        Task.plan_date <= we,
    ).all()
    plans = db.query(DailyPlan).filter(
        DailyPlan.user_id == user.id,
        DailyPlan.plan_date >= ws,
        DailyPlan.plan_date <= we,
    ).all()

    total = len(tasks)
    done = len([t for t in tasks if t.status == TaskStatus.DONE])
    must_tasks = [t for t in tasks if t.priority == TaskPriority.MUST]
    must_done = len([t for t in must_tasks if t.status == TaskStatus.DONE])

    avg_mood = sum(p.mood_morning or 5 for p in plans) / max(len(plans), 1)
    avg_energy = sum(p.energy_level or 5 for p in plans) / max(len(plans), 1)
    avg_stress = sum(p.stress_level or 5 for p in plans) / max(len(plans), 1)

    execution_score = round((done / max(total, 1)) * 100)
    must_pct = round((must_done / max(len(must_tasks), 1)) * 100)
    wellbeing_score = round(((avg_mood + avg_energy + (10 - avg_stress)) / 30) * 100)
    overall_score = round(execution_score * 0.6 + wellbeing_score * 0.4)

    review = db.query(WeeklyReview).filter(
        WeeklyReview.user_id == user.id,
        WeeklyReview.week_start == ws,
    ).first()

    if review:
        review.tasks_planned = total
        review.tasks_completed = done
        review.must_completed_pct = must_pct
        review.avg_mood = avg_mood
        review.avg_energy = avg_energy
        review.avg_stress = avg_stress
        review.execution_score = execution_score
        review.wellbeing_score = wellbeing_score
        review.overall_score = overall_score
        review.wins = wins
        review.improvements = improvements
        review.next_week_focus = next_week_focus
    else:
        review = WeeklyReview(
            user_id=user.id,
            week_start=ws,
            week_end=we,
            tasks_planned=total,
            tasks_completed=done,
            must_completed_pct=must_pct,
            avg_mood=avg_mood,
            avg_energy=avg_energy,
            avg_stress=avg_stress,
            execution_score=execution_score,
            wellbeing_score=wellbeing_score,
            overall_score=overall_score,
            wins=wins,
            improvements=improvements,
            next_week_focus=next_week_focus,
        )
        db.add(review)

    db.commit()
    return RedirectResponse(url=f"/plos/weekly?week_start={week_start}", status_code=303)
