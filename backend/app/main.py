
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas


# ==========================================
# DATABASE TABLE CREATION
# ==========================================

Base.metadata.create_all(bind=engine)


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="StudentSpend AI",
    description="Student Expense Management and Financial Analytics API",
    version="2.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# BASIC ROUTES
# ==========================================

@app.get("/")
def home():
    return {"message": "Welcome to StudentSpend AI API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ==========================================
# 1. EXPENSE APIs
# ==========================================

# Add a new expense
@app.post("/expenses", response_model=schemas.ExpenseResponse)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db)
):
    new_expense = models.Expense(**expense.model_dump())

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return new_expense


# Get all expenses
@app.get("/expenses", response_model=list[schemas.ExpenseResponse])
def get_expenses(db: Session = Depends(get_db)):
    return db.query(models.Expense).order_by(
        models.Expense.expense_date.desc()
    ).all()


# Update an expense
@app.put("/expenses/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: schemas.ExpenseCreate,
    db: Session = Depends(get_db)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    expense.title = expense_data.title
    expense.amount = expense_data.amount
    expense.category = expense_data.category
    expense.expense_date = expense_data.expense_date
    expense.note = expense_data.note

    db.commit()
    db.refresh(expense)

    return expense


# Delete an expense
@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id
    ).first()

    if expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted successfully"}


# ==========================================
# 2. MONTHLY BUDGET APIs
# ==========================================

# Create a monthly budget
@app.post(
    "/budgets/monthly",
    response_model=schemas.MonthlyBudgetResponse
)
def create_monthly_budget(
    budget_data: schemas.MonthlyBudgetCreate,
    db: Session = Depends(get_db)
):
    existing_budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.year == budget_data.year,
        models.MonthlyBudget.month == budget_data.month
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Monthly budget already exists. Use PUT to update it."
        )

    new_budget = models.MonthlyBudget(**budget_data.model_dump())

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


# Get monthly budget for a particular month
@app.get(
    "/budgets/monthly",
    response_model=schemas.MonthlyBudgetResponse
)
def get_monthly_budget(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.year == year,
        models.MonthlyBudget.month == month
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly budget not found"
        )

    return budget


# Update an existing monthly budget
@app.put(
    "/budgets/monthly/{budget_id}",
    response_model=schemas.MonthlyBudgetResponse
)
def update_monthly_budget(
    budget_id: int,
    budget_data: schemas.MonthlyBudgetCreate,
    db: Session = Depends(get_db)
):
    budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.id == budget_id
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly budget not found"
        )

    duplicate = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.year == budget_data.year,
        models.MonthlyBudget.month == budget_data.month,
        models.MonthlyBudget.id != budget_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A budget already exists for this month."
        )

    budget.year = budget_data.year
    budget.month = budget_data.month
    budget.amount = budget_data.amount

    db.commit()
    db.refresh(budget)

    return budget


# ==========================================
# 3. CATEGORY-WISE BUDGET APIs
# ==========================================

# Create a category budget
@app.post(
    "/budgets/category",
    response_model=schemas.CategoryBudgetResponse
)
def create_category_budget(
    budget_data: schemas.CategoryBudgetCreate,
    db: Session = Depends(get_db)
):
    existing_budget = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.year == budget_data.year,
        models.CategoryBudget.month == budget_data.month,
        models.CategoryBudget.category == budget_data.category
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Category budget already exists. Use PUT to update it."
        )

    new_budget = models.CategoryBudget(**budget_data.model_dump())

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


# Get all category budgets for a particular month
@app.get(
    "/budgets/category",
    response_model=list[schemas.CategoryBudgetResponse]
)
def get_category_budgets(
    year: int,
    month: int,
    db: Session = Depends(get_db)
):
    budgets = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.year == year,
        models.CategoryBudget.month == month
    ).order_by(models.CategoryBudget.category).all()

    return budgets


# Update a category budget
@app.put(
    "/budgets/category/{budget_id}",
    response_model=schemas.CategoryBudgetResponse
)
def update_category_budget(
    budget_id: int,
    budget_data: schemas.CategoryBudgetCreate,
    db: Session = Depends(get_db)
):
    budget = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.id == budget_id
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Category budget not found"
        )

    duplicate = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.year == budget_data.year,
        models.CategoryBudget.month == budget_data.month,
        models.CategoryBudget.category == budget_data.category,
        models.CategoryBudget.id != budget_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="This category already has a budget for this month."
        )

    budget.year = budget_data.year
    budget.month = budget_data.month
    budget.category = budget_data.category
    budget.amount = budget_data.amount

    db.commit()
    db.refresh(budget)

    return budget
