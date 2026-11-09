
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# 1. EXPENSE SCHEMAS
# ==========================================

class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    amount: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2
    )
    category: str = Field(min_length=1, max_length=100)
    expense_date: date
    note: str | None = None


class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: Decimal
    category: str
    expense_date: date
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. MONTHLY BUDGET SCHEMAS
# ==========================================

class MonthlyBudgetCreate(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    amount: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2
    )


class MonthlyBudgetResponse(BaseModel):
    id: int
    year: int
    month: int
    amount: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. CATEGORY BUDGET SCHEMAS
# ==========================================

class CategoryBudgetCreate(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    category: str = Field(min_length=1, max_length=100)
    amount: Decimal = Field(
        gt=0,
        max_digits=10,
        decimal_places=2
    )


class CategoryBudgetResponse(BaseModel):
    id: int
    year: int
    month: int
    category: str
    amount: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
