from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ─── Enums ────────────────────────────────────────────────

class TaskPriority(str, enum.Enum):
    MUST = "must"
    SHOULD = "should"
    NICE = "nice"
    PARKING = "parking"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    DEFERRED = "deferred"


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class DebtType(str, enum.Enum):
    CREDIT_CARD = "credit_card"
    PERSONAL_LOAN = "personal_loan"
    MORTGAGE = "mortgage"
    CAR_LOAN = "car_loan"
    OTHER = "other"


class DebtStrategy(str, enum.Enum):
    SNOWBALL = "snowball"
    AVALANCHE = "avalanche"
    HYBRID = "hybrid"


class ExerciseType(str, enum.Enum):
    SWIMMING = "swimming"
    STRENGTH = "strength"
    WALKING = "walking"
    OTHER = "other"


# ─── User ─────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    age = Column(Integer)
    height_m = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    daily_plans = relationship("DailyPlan", back_populates="user", cascade="all, delete-orphan")
    weekly_reviews = relationship("WeeklyReview", back_populates="user", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="user", cascade="all, delete-orphan")
    exercises = relationship("Exercise", back_populates="user", cascade="all, delete-orphan")
    habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    habit_logs = relationship("HabitLog", back_populates="user", cascade="all, delete-orphan")


# ─── Phase 1: PLOS (Personal Life Operating System) ──────

class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_date = Column(Date, nullable=False)
    top_priority = Column(String(500))
    energy_level = Column(Integer)  # 1-10
    mood_morning = Column(Integer)  # 1-10
    mood_evening = Column(Integer)  # 1-10
    stress_level = Column(Integer)  # 1-10
    notes = Column(Text)
    score = Column(Float)  # daily execution score 0-100
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="daily_plans")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.SHOULD)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING)
    due_date = Column(Date)
    plan_date = Column(Date)  # which day it's planned for
    category = Column(String(100))  # work, personal, finance, health
    estimated_minutes = Column(Integer)
    actual_minutes = Column(Integer)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="tasks")


class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)

    # Execution metrics
    tasks_planned = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    must_completed_pct = Column(Float, default=0)

    # Emotional metrics
    avg_mood = Column(Float)
    avg_energy = Column(Float)
    avg_stress = Column(Float)

    # Scores
    execution_score = Column(Float)  # 0-100
    wellbeing_score = Column(Float)  # 0-100
    overall_score = Column(Float)  # weighted composite

    wins = Column(Text)  # what went well
    improvements = Column(Text)  # what to improve
    next_week_focus = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="weekly_reviews")


# ─── Phase 2: Financial System ───────────────────────────

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    account_type = Column(String(50))  # checking, savings, credit_card, cash
    balance = Column(Float, default=0)
    currency = Column(String(10), default="MXN")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100))
    description = Column(String(500))
    transaction_date = Column(Date, nullable=False)
    is_recurring = Column(Boolean, default=False)
    recurring_day = Column(Integer)  # day of month for recurring
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    debt_type = Column(SAEnum(DebtType), default=DebtType.OTHER)
    original_amount = Column(Float, nullable=False)
    current_balance = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)  # annual %
    minimum_payment = Column(Float, nullable=False)
    due_day = Column(Integer)  # day of month
    start_date = Column(Date)
    target_payoff_date = Column(Date)
    is_active = Column(Boolean, default=True)
    strategy = Column(SAEnum(DebtStrategy), default=DebtStrategy.AVALANCHE)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="debts")
    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, ForeignKey("debts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    balance_after = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    debt = relationship("Debt", back_populates="payments")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(100), nullable=False)
    monthly_limit = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="budgets")


# ─── Phase 3: Health System ──────────────────────────────

class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_date = Column(Date, nullable=False)
    weight_kg = Column(Float)
    waist_cm = Column(Float)
    glucose_fasting = Column(Float)  # mg/dL
    glucose_post_meal = Column(Float)  # mg/dL
    blood_pressure_sys = Column(Integer)
    blood_pressure_dia = Column(Integer)
    hba1c = Column(Float)  # quarterly
    sleep_hours = Column(Float)
    sleep_quality = Column(Integer)  # 1-10
    stress_level = Column(Integer)  # 1-10
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="health_metrics")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exercise_date = Column(Date, nullable=False)
    exercise_type = Column(SAEnum(ExerciseType), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    intensity = Column(Integer)  # 1-10
    calories_burned = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="exercises")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50))  # health, finance, productivity
    frequency = Column(String(20), default="daily")  # daily, weekly
    target_count = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    log_date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    value = Column(Float)  # optional numeric value
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="habit_logs")
    habit = relationship("Habit", back_populates="logs")
