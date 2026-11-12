
from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    String,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.sql import func
from app.database import Base


# ==========================================
# USER MODEL
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False, default="Student")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# EXPENSE MODEL
# ==========================================

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(100), nullable=False)
    expense_date = Column(Date, nullable=False)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# MONTHLY BUDGET MODEL
# ==========================================

class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"

    __table_args__ = (
        UniqueConstraint(
            "user_id", "year", "month",
            name="unique_user_monthly_budget"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# CATEGORY BUDGET MODEL
# ==========================================

class CategoryBudget(Base):
    __tablename__ = "category_budgets"

    __table_args__ = (
        UniqueConstraint(
            "user_id", "year", "month", "category",
            name="unique_user_category_budget"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ==========================================
# SAVINGS GOAL MODEL
# ==========================================

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    target_amount = Column(Numeric(10, 2), nullable=False)
    saved_amount = Column(Numeric(10, 2), nullable=False, default=0)
    deadline = Column(Date, nullable=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
