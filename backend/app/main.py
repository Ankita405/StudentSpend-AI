
import os
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from dotenv import load_dotenv
from pwdlib import PasswordHash

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas


# ==========================================
# ENVIRONMENT AND AUTHENTICATION
# ==========================================

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing in backend/.env")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

password_hash = PasswordHash.recommended()
security = HTTPBearer()


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
    version="3.0.0"
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
   app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://studentspend-ai-deploy.vercel.app",
        "https://studentspend-ai-deploy-ewtmmvkht-ankita-22ca.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# JWT AUTHENTICATION DEPENDENCY
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

        user_id = int(user_id)

    except (InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

    user = db.query(models.User).filter(
        models.User.id == user_id
    ).first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )

    return user


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
# USER REGISTRATION
# ==========================================

@app.post("/register", response_model=schemas.UserResponse)
def register_user(
    user_data: schemas.UserRegister,
    db: Session = Depends(get_db)
):
    email = user_data.email.strip().lower()

    existing_user = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    new_user = models.User(
        full_name=user_data.full_name.strip(),
        email=email,
        hashed_password=password_hash.hash(user_data.password),
        account_type=user_data.account_type
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ==========================================
# USER LOGIN
# ==========================================

@app.post("/login", response_model=schemas.TokenResponse)
def login_user(
    login_data: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    email = login_data.email.strip().lower()

    user = db.query(models.User).filter(
        models.User.email == email
    ).first()

    if not user or not password_hash.verify(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    expire_time = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token = jwt.encode(
        {
            "sub": str(user.id),
            "exp": expire_time
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


# ==========================================
# CURRENT USER PROFILE
# ==========================================

@app.get("/users/me", response_model=schemas.UserResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user


# ==========================================
# 1. EXPENSE APIs
# ==========================================

# Create expense
@app.post("/expenses", response_model=schemas.ExpenseResponse)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_expense = models.Expense(
        **expense.model_dump(),
        user_id=current_user.id
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return new_expense


# Get only current user's expenses
@app.get("/expenses", response_model=list[schemas.ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id
    ).order_by(
        models.Expense.expense_date.desc()
    ).all()


# Update own expense
@app.put("/expenses/{expense_id}", response_model=schemas.ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.user_id == current_user.id
    ).first()

    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.title = expense_data.title
    expense.amount = expense_data.amount
    expense.category = expense_data.category
    expense.expense_date = expense_data.expense_date
    expense.note = expense_data.note

    db.commit()
    db.refresh(expense)

    return expense


# Delete own expense
@app.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.user_id == current_user.id
    ).first()

    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted successfully"}


# Delete only current user's expenses
@app.delete("/expenses")
def delete_all_expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deleted_count = db.query(models.Expense).filter(
        models.Expense.user_id == current_user.id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "message": "All your expenses deleted successfully",
        "deleted_count": deleted_count
    }


# ==========================================
# 2. MONTHLY BUDGET APIs
# ==========================================

# Create monthly budget
@app.post(
    "/budgets/monthly",
    response_model=schemas.MonthlyBudgetResponse
)
def create_monthly_budget(
    budget_data: schemas.MonthlyBudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing_budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.user_id == current_user.id,
        models.MonthlyBudget.year == budget_data.year,
        models.MonthlyBudget.month == budget_data.month
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Monthly budget already exists. Use PUT to update it."
        )

    new_budget = models.MonthlyBudget(
        **budget_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


# Get own monthly budget
@app.get(
    "/budgets/monthly",
    response_model=schemas.MonthlyBudgetResponse
)
def get_monthly_budget(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.user_id == current_user.id,
        models.MonthlyBudget.year == year,
        models.MonthlyBudget.month == month
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly budget not found"
        )

    return budget


# Update own monthly budget
@app.put(
    "/budgets/monthly/{budget_id}",
    response_model=schemas.MonthlyBudgetResponse
)
def update_monthly_budget(
    budget_id: int,
    budget_data: schemas.MonthlyBudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.id == budget_id,
        models.MonthlyBudget.user_id == current_user.id
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly budget not found"
        )

    duplicate = db.query(models.MonthlyBudget).filter(
        models.MonthlyBudget.user_id == current_user.id,
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
# 3. CATEGORY BUDGET APIs
# ==========================================

# Create category budget
@app.post(
    "/budgets/category",
    response_model=schemas.CategoryBudgetResponse
)
def create_category_budget(
    budget_data: schemas.CategoryBudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing_budget = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.user_id == current_user.id,
        models.CategoryBudget.year == budget_data.year,
        models.CategoryBudget.month == budget_data.month,
        models.CategoryBudget.category == budget_data.category
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Category budget already exists. Use PUT to update it."
        )

    new_budget = models.CategoryBudget(
        **budget_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


# Get own category budgets
@app.get(
    "/budgets/category",
    response_model=list[schemas.CategoryBudgetResponse]
)
def get_category_budgets(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.CategoryBudget).filter(
        models.CategoryBudget.user_id == current_user.id,
        models.CategoryBudget.year == year,
        models.CategoryBudget.month == month
    ).order_by(
        models.CategoryBudget.category
    ).all()


# Update own category budget
@app.put(
    "/budgets/category/{budget_id}",
    response_model=schemas.CategoryBudgetResponse
)
def update_category_budget(
    budget_id: int,
    budget_data: schemas.CategoryBudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.id == budget_id,
        models.CategoryBudget.user_id == current_user.id
    ).first()

    if budget is None:
        raise HTTPException(
            status_code=404,
            detail="Category budget not found"
        )

    duplicate = db.query(models.CategoryBudget).filter(
        models.CategoryBudget.user_id == current_user.id,
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


# ==========================================
# 4. SAVINGS GOAL APIs
# ==========================================

# Create savings goal
@app.post(
    "/savings-goals",
    response_model=schemas.SavingsGoalResponse
)
def create_savings_goal(
    goal_data: schemas.SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_goal = models.SavingsGoal(
        **goal_data.model_dump(),
        user_id=current_user.id
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return new_goal


# Get own savings goals
@app.get(
    "/savings-goals",
    response_model=list[schemas.SavingsGoalResponse]
)
def get_savings_goals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.SavingsGoal).filter(
        models.SavingsGoal.user_id == current_user.id
    ).order_by(
        models.SavingsGoal.created_at.desc()
    ).all()


# Update own savings goal
@app.put(
    "/savings-goals/{goal_id}",
    response_model=schemas.SavingsGoalResponse
)
def update_savings_goal(
    goal_id: int,
    goal_data: schemas.SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.SavingsGoal).filter(
        models.SavingsGoal.id == goal_id,
        models.SavingsGoal.user_id == current_user.id
    ).first()

    if goal is None:
        raise HTTPException(
            status_code=404,
            detail="Savings goal not found"
        )

    goal.title = goal_data.title
    goal.target_amount = goal_data.target_amount
    goal.saved_amount = goal_data.saved_amount
    goal.deadline = goal_data.deadline
    goal.note = goal_data.note

    db.commit()
    db.refresh(goal)

    return goal


# Delete own savings goal
@app.delete("/savings-goals/{goal_id}")
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    goal = db.query(models.SavingsGoal).filter(
        models.SavingsGoal.id == goal_id,
        models.SavingsGoal.user_id == current_user.id
    ).first()

    if goal is None:
        raise HTTPException(
            status_code=404,
            detail="Savings goal not found"
        )

    db.delete(goal)
    db.commit()

    return {"message": "Savings goal deleted successfully"}
