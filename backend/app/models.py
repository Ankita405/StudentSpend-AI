
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    UniqueConstraint
)
from sqlalchemy.sql import func

from app.database import Base


# Expense Model
class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(100), nullable=False)
    expense_date = Column(Date, nullable=False)
    note = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# Monthly Budget Model
class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"

    __table_args__ = (
        UniqueConstraint("year", "month", name="unique_monthly_budget"),
    )

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# Category-wise Budget Model
class CategoryBudget(Base):
    __tablename__ = "category_budgets"

    __table_args__ = (
        UniqueConstraint(
            "year",
            "month",
            "category",
            name="unique_category_budget"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
