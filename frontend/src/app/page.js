"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Wallet, Receipt, Target, Leaf, Bot,
  Settings, CircleHelp, Search, Bell, Plus, ArrowUpRight,
  ArrowDownRight, ShoppingBag, Bus, BookOpen,
  MoreHorizontal, CalendarDays, X, Send, Menu,
  Sparkles, PiggyBank, Coffee, GraduationCap, Trash2
} from "lucide-react";

const API_URL = "https://studentspend-ai-nbcd.onrender.com";
const DEFAULT_MONTHLY_BUDGET = 0;

// Automatically attach JWT token to backend API requests
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("studentSpendToken");

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {})
    }
  });
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, group: "GENERAL" },
  { label: "Transactions", icon: Receipt, group: "GENERAL" },
  { label: "Budget & Expenses", icon: Wallet, group: "GENERAL" },
  { label: "Savings Goals", icon: Target, group: "GENERAL" },
  { label: "Sustainability", icon: Leaf, group: "TOOLS" },
  { label: "AI Assistant", icon: Bot, group: "TOOLS" }
];

const categoryOptions = [
  { name: "Food", icon: Coffee, color: "#A77BFF" },
  { name: "Shopping", icon: ShoppingBag, color: "#36C9B6" },
  { name: "Transport", icon: Bus, color: "#E8B94F" },
  { name: "Education", icon: BookOpen, color: "#6599F5" },
  { name: "Other", icon: Receipt, color: "#E58BB8" }
];

function money(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getCategoryIcon(category) {
  return categoryOptions.find(item => item.name === category)?.icon || Receipt;
}

function getCategoryColor(category) {
  return categoryOptions.find(item => item.name === category)?.color || "#A77BFF";
}

function getLastSevenDays(expenses) {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const dateKey = localDateString(date);

    const amount = expenses
      .filter(item => item.date === dateKey)
      .reduce((sum, item) => sum + item.amount, 0);

    days.push({
      date: dateKey,
      day: date.toLocaleDateString("en-IN", { weekday: "short" }),
      amount
    });
  }

  return days;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetError, setBudgetError] = useState("");

  const [monthlyBudget, setMonthlyBudget] = useState(DEFAULT_MONTHLY_BUDGET);
  const [monthlyBudgetId, setMonthlyBudgetId] = useState(null);
  const [budgetInput, setBudgetInput] = useState(String(DEFAULT_MONTHLY_BUDGET));
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Savings Goals states
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("0");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalNote, setGoalNote] = useState("");

  // Settings - Profile States
  const [accountName, setAccountName] = useState("Student Account");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountType, setAccountType] = useState("Student");

  // Login and Registration States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authAccountType, setAuthAccountType] = useState("Student");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("studentSpendToken");

    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const [profileSaved, setProfileSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState(localDateString());
  const [expenseNote, setExpenseNote] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // Load saved profile
  useEffect(() => {
    const savedProfile = localStorage.getItem("studentSpendProfile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setAccountName(profile.accountName || "Student Account");
      setAccountEmail(profile.accountEmail || "");
      setAccountType(profile.accountType || "Student");
    }
  }, []);

  // Load saved profile
  useEffect(() => {
    const savedProfile = localStorage.getItem("studentSpendProfile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setAccountName(profile.accountName || "Student Account");
      setAccountEmail(profile.accountEmail || "");
      setAccountType(profile.accountType || "Student");
    }
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();

    setAuthError("");
    setAuthLoading(true);

    try {
      const isRegister = authMode === "register";
      const endpoint = isRegister ? "/register" : "/login";

      const payload = isRegister
        ? {
            full_name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
            account_type: authAccountType
          }
        : {
            email: authEmail.trim(),
            password: authPassword
          };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

    if (!response.ok) {
  let errorMessage = "Authentication failed";

  if (typeof data.detail === "string") {
    errorMessage = data.detail;
  } else if (Array.isArray(data.detail)) {
    errorMessage = data.detail
      .map(item => item.msg || JSON.stringify(item))
      .join(", ");
  } else if (data.detail && typeof data.detail === "object") {
    errorMessage = JSON.stringify(data.detail);
  }

  throw new Error(errorMessage);
}

      if (isRegister) {
        setAuthMode("login");
        setAuthError("Registration successful. Please log in.");
        return;
      }

      localStorage.setItem("studentSpendToken", data.access_token);

      localStorage.setItem(
        "studentSpendProfile",
        JSON.stringify({
          accountName: data.user?.full_name || "Student Account",
          accountEmail: data.user?.email || authEmail,
          accountType: data.user?.account_type || "Student"
        })
      );

      setAccountName(data.user?.full_name || "Student Account");
      setAccountEmail(data.user?.email || authEmail);
      setAccountType(data.user?.account_type || "Student");

      setIsLoggedIn(true);
} catch (error) {
  console.error("Authentication Error:", error);
  setAuthError(
    typeof error.message === "string"
      ? error.message
      : "Unable to authenticate. Please try again."
  );
}
     finally {
      setAuthLoading(false);
    }
  }

  // Fetch expenses from backend.
  const fetchExpenses = useCallback(async () => {
    try {
      setApiError("");

      const response = await apiFetch(`${API_URL}/expenses`);

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();

      const formatted = data.map(expense => ({
        id: expense.id,
        name: expense.title,
        category: expense.category,
        date: expense.expense_date,
        amount: Number(expense.amount),
        note: expense.note || ""
      }));

      setTransactions(formatted);
    } catch (error) {
      console.error("Fetch error:", error);

      setApiError(
        "Unable to load expenses. Check that FastAPI is running at https://studentspend-ai-nbcd.onrender.com"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved profile from localStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem("studentSpendProfile");

    if (savedProfile) {
      const profile = JSON.parse(savedProfile);

      setAccountName(profile.accountName || "Student Account");
      setAccountEmail(profile.accountEmail || "");
      setAccountType(profile.accountType || "Student");
      setCurrency(profile.currency || "INR");
    }
  }, []);

  // Fetch current month's budget.
  const fetchMonthlyBudget = useCallback(async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
      const response = await apiFetch(
        `${API_URL}/budgets/monthly?year=${year}&month=${month}`
      );

      if (response.status === 404) {
        setMonthlyBudgetId(null);
        setMonthlyBudget(DEFAULT_MONTHLY_BUDGET);
        setBudgetInput(String(DEFAULT_MONTHLY_BUDGET));
        return;
      }

      if (!response.ok) {
        throw new Error(`Budget API returned status ${response.status}`);
      }

      const data = await response.json();
      const budget = Array.isArray(data) ? data[0] : data;

      if (budget && budget.amount !== undefined) {
        setMonthlyBudgetId(budget.id ?? null);
        setMonthlyBudget(Number(budget.amount));
        setBudgetInput(String(budget.amount));
      } else {
        setMonthlyBudgetId(null);
        setMonthlyBudget(DEFAULT_MONTHLY_BUDGET);
        setBudgetInput(String(DEFAULT_MONTHLY_BUDGET));
      }
    } catch (error) {
      console.error("Monthly budget fetch error:", error);

      setApiError(
        "Unable to load the monthly budget. Please check that the backend is running."
      );
    } finally {
      setBudgetLoading(false);
    }
  }, []);

  // Fetch savings goals from database
  const fetchSavingsGoals = useCallback(async () => {
    try {
      setGoalsError("");

      const response = await apiFetch(`${API_URL}/savings-goals`);

      if (!response.ok) {
        throw new Error(`Savings Goals API error: ${response.status}`);
      }

      const data = await response.json();
      setSavingsGoals(data);

    } catch (error) {
      console.error("Savings Goals fetch error:", error);
      setGoalsError("Unable to load savings goals. Please check the backend.");
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    fetchExpenses();
    fetchMonthlyBudget();
    fetchSavingsGoals();
  }, [isLoggedIn, fetchExpenses, fetchMonthlyBudget, fetchSavingsGoals]);

  // Save or update monthly budget.
  async function saveMonthlyBudget(event) {
    event.preventDefault();

    const amount = Number(budgetInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      setApiError("Please enter a valid budget amount greater than zero.");
      return;
    }

    const today = new Date();

    const payload = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      amount
    };

    setBudgetSaving(true);
    setApiError("");

    try {
      const url = monthlyBudgetId
        ? `${API_URL}/budgets/monthly/${monthlyBudgetId}`
        : `${API_URL}/budgets/monthly`;

      const response = await apiFetch(url, {
        method: monthlyBudgetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : `Could not save monthly budget (status ${response.status}).`
        );
      }

      const savedBudget = await response.json();

      setMonthlyBudgetId(savedBudget.id ?? monthlyBudgetId);
      setMonthlyBudget(Number(savedBudget.amount ?? amount));
      setBudgetInput(String(savedBudget.amount ?? amount));
    } catch (error) {
      setApiError(error.message || "Unable to save monthly budget.");
    } finally {
      setBudgetSaving(false);
    }
  }
    // Calculate current month's expenses.
  const currentMonth = localDateString().slice(0, 7);

  const monthlyTransactions = transactions.filter(item =>
    item.date?.startsWith(currentMonth)
  );

  const totalSpent = monthlyTransactions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const remainingBudget = Math.max(monthlyBudget - totalSpent, 0);

  const budgetPercentage = monthlyBudget > 0
    ? Math.min((totalSpent / monthlyBudget) * 100, 100)
    : 0;

  // Category-wise spending.
  const categories = categoryOptions.map(category => {
    const amount = monthlyTransactions
      .filter(item => item.category === category.name)
      .reduce((sum, item) => sum + item.amount, 0);

    return { ...category, amount };
  });

  // Last seven days spending.
  const dailySpending = getLastSevenDays(transactions);

  const maxDailySpending = Math.max(
    ...dailySpending.map(item => item.amount),
    1
  );

  // Add expense to database.
  async function addTransaction(event) {
    event.preventDefault();

    if (!expenseName.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      return;
    }

    setSaving(true);
    setApiError("");

    try {
      const response = await apiFetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseName.trim(),
          amount: Number(expenseAmount),
          category: expenseCategory,
          expense_date: expenseDate,
          note: expenseNote.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : "Could not save the expense. Check the entered details."
        );
      }

      await fetchExpenses();

      setExpenseName("");
      setExpenseAmount("");
      setExpenseCategory("Food");
      setExpenseDate(localDateString());
      setExpenseNote("");
      setShowAdd(false);
    } catch (error) {
      setApiError(error.message || "Unable to save expense.");
    } finally {
      setSaving(false);
    }
  }

  // Delete expense from database.
  async function deleteTransaction(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    setDeletingId(id);
    setApiError("");

    try {
      const response = await apiFetch(`${API_URL}/expenses/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Could not delete this transaction.");
      }

      await fetchExpenses();
    } catch (error) {
      setApiError(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Basic database-based assistant.
  function askAssistant(event) {
    event.preventDefault();

    const userQuestion = question.trim().toLowerCase();

    if (!userQuestion) return;

    const total = transactions.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const categoryTotals = transactions.reduce((result, item) => {
      const category = item.category || "Other";

      result[category] =
        (result[category] || 0) + Number(item.amount || 0);

      return result;
    }, {});

    const categories = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    );

    const highestCategory = categories[0];

    let reply = "";

    if (
      userQuestion.includes("highest") ||
      userQuestion.includes("most") ||
      userQuestion.includes("category")
    ) {
      reply = highestCategory
        ? `Your highest spending category is ${highestCategory[0]} with ${money(highestCategory[1])} spent.`
        : "You have not recorded any expenses yet.";
    }

    else if (
      userQuestion.includes("budget") ||
      userQuestion.includes("remaining")
    ) {
      reply =
        `Your monthly budget is ${money(monthlyBudget)}. ` +
        `You have spent ${money(totalSpent)} and have ${money(remainingBudget)} remaining.`;
    }

    else if (
      userQuestion.includes("total") ||
      userQuestion.includes("spent") ||
      userQuestion.includes("expense")
    ) {
      reply =
        `Your total recorded spending is ${money(total)} ` +
        `across ${transactions.length} transactions.`;
    }

    else if (
      userQuestion.includes("save") ||
      userQuestion.includes("saving") ||
      userQuestion.includes("reduce")
    ) {
      reply = highestCategory
        ? `Your biggest spending area is ${highestCategory[0]}. ` +
          `Review these purchases and set a limit for this category to improve your savings.`
        : "Start recording expenses to receive personalized saving suggestions.";
    }

    else if (
      userQuestion.includes("hello") ||
      userQuestion.includes("hi") ||
      userQuestion.includes("hey")
    ) {
      reply =
        "Hello! I am your StudentSpend finance assistant. " +
        "Ask me about your spending, budget or savings.";
    }

    else {
      reply =
        "I can help you analyze your total spending, highest spending category, " +
        "monthly budget and savings. Try asking: Where did I spend the most?";
    }

    setAnswer(reply);
    setQuestion("");
  }

  // Save or update a savings goal
  async function saveSavingsGoal(event) {
    event.preventDefault();

    const target = Number(String(goalTarget ?? "").trim());
    const saved = Number(String(goalSaved ?? "0").trim());

    if (!goalTitle.trim() || !Number.isFinite(target) || target <= 0) {
      setGoalsError("Please enter a goal title and a valid target amount.");
      return;
    }

    if (!Number.isFinite(saved) || saved < 0 || saved > target) {
      setGoalsError("Saved amount must be between zero and the target amount.");
      return;
    }

    const payload = {
      title: goalTitle.trim(),
      target_amount: target,
      saved_amount: saved,
      deadline: goalDeadline || null,
      note: goalNote.trim() || null
    };

    setGoalSaving(true);
    setGoalsError("");

    try {
      const url = editingGoalId
        ? `${API_URL}/savings-goals/${editingGoalId}`
        : `${API_URL}/savings-goals`;

      const response = await apiFetch(url, {
        method: editingGoalId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorData.detail === "string"
            ? errorData.detail
            : "Unable to save savings goal."
        );
      }

      await fetchSavingsGoals();

      setGoalTitle("");
      setGoalTarget("");
      setGoalSaved("0");
      setGoalDeadline("");
      setGoalNote("");
      setEditingGoalId(null);

    } catch (error) {
      setGoalsError(error.message);
    } finally {
      setGoalSaving(false);
    }
  }

  // Load a goal into the form for editing
  function editSavingsGoal(goal) {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalTarget(String(goal.target_amount));
    setGoalSaved(String(goal.saved_amount));
    setGoalDeadline(goal.deadline || "");
    setGoalNote(goal.note || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // Delete a savings goal
  async function deleteSavingsGoal(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this savings goal?"
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API_URL}/savings-goals/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Unable to delete savings goal.");
      }

      await fetchSavingsGoals();

    } catch (error) {
      console.error("Delete Savings Goal Error:", error);
      alert(error.message || "Unable to delete savings goal.");
    }
  }

  const authInputStyle = {
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #344966",
    background: "#071326",
    color: "white",
    fontSize: "15px"
  };

  if (!isLoggedIn) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#071326",
          color: "white",
          padding: "24px"
        }}
      >
        <form
          onSubmit={handleAuthSubmit}
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "#10213b",
            padding: "30px",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          <h1 style={{ textAlign: "center" }}>StudentSpend AI</h1>

          <h3 style={{ textAlign: "center" }}>
            {authMode === "login" ? "Login to Your Account" : "Create Your Account"}
          </h3>

          {authMode === "register" && (
            <input
              type="text"
              placeholder="Full Name"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              required
              style={authInputStyle}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            required
            style={authInputStyle}
          />

          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            required
            style={authInputStyle}
          />

          {authMode === "register" && (
            <select
              value={authAccountType}
              onChange={(e) => setAuthAccountType(e.target.value)}
              style={authInputStyle}
            >
              <option value="Student">Student</option>
              <option value="Professional">Professional</option>
            </select>
          )}

          {authError && (
            <p style={{ color: "#ff8585", fontSize: "14px" }}>
              {authError}
            </p>
          )}

          <button type="submit" disabled={authLoading}>
            {authLoading
              ? "Please wait..."
              : authMode === "login"
              ? "Login"
              : "Register"}
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError("");
            }}
          >
            {authMode === "login"
              ? "Create New Account"
              : "Back to Login"}
          </button>
        </form>
      </main>
    );
  }

  return (

    <main className="app-shell">

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>
            Student<span className="brand-accent">Spend</span>
          </span>
        </div>

        <div className="profile-mini">
          <div className="avatar">S</div>
          <div>
            <strong>Student Account</strong>
            <small>Personal Finance</small>
          </div>
        </div>

        {["GENERAL", "TOOLS"].map(group => (
          <div className="nav-group" key={group}>
            <p className="nav-heading">{group}</p>

            {navItems.filter(item => item.group === group).map(item => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className={`nav-item ${activeNav === item.label ? "active" : ""}`}
                  onClick={() => {
                    setActiveNav(item.label);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setActiveNav("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <button className="nav-item">
            <CircleHelp size={19} />
            <span>Help & Support</span>
          </button>

          <div className="sidebar-footer">
            StudentSpend AI © 2026
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h2>{activeNav}</h2>
              <p>Your financial overview</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search">
              <Search size={19} />
            </button>

            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>

            <div className="user-profile">
              <div className="avatar">S</div>
              <div>
                <strong>Student Account</strong>
                <small>Student</small>
              </div>
            </div>
          </div>
        </header>

        {activeNav === "Dashboard" ? (
          <div className="dashboard-content">

            {/* WELCOME */}
            <div className="welcome-row">
              <div>
                <h1>Welcome back! <span>✦</span></h1>
                <p>Here's what's happening with your money today.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowAdd(true)}
              >
                <Plus size={18} /> Add Transaction
              </button>
            </div>

            {apiError && (
              <div style={{
                padding: "12px",
                marginBottom: "16px",
                background: "#ffe8e8",
                color: "#b42318",
                borderRadius: "8px"
              }}>
                {apiError}
              </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="summary-grid">

              <div className="summary-card">
                <div className="card-top">
                  <span>Total Balance</span>
                  <div className="stat-icon purple">
                    <Wallet size={20} />
                  </div>
                </div>
                <h2>Not set</h2>
                <div className="stat-footer neutral">
                  Add income details to calculate balance
                </div>
              </div>

              <div className="summary-card">
                <div className="card-top">
                  <span>Monthly Spending</span>
                  <div className="stat-icon pink">
                    <ArrowDownRight size={20} />
                  </div>
                </div>
                <h2>{money(totalSpent)}</h2>
                <div className="stat-footer neutral">
                  {loading ? "Loading expenses..." : "From database records"}
                </div>
              </div>

              <div className="summary-card">
                <div className="card-top">
                  <span>Monthly Savings</span>
                  <div className="stat-icon green">
                    <PiggyBank size={20} />
                  </div>
                </div>
                <h2>Not set</h2>
                <div className="stat-footer neutral">
                  Add savings details to calculate
                </div>
              </div>

              <div className="summary-card">
                <div className="card-top">
                  <span>Monthly Budget</span>
                  <div className="stat-icon blue">
                    <Target size={20} />
                  </div>
                </div>
                <h2>{money(monthlyBudget)}</h2>
                <div className="budget-mini">
                  <div className="progress-track">
                    <div
                      className="progress-fill purple-fill"
                      style={{ width: `${budgetPercentage}%` }}
                    />
                  </div>
                  <small>{Math.round(budgetPercentage)}% used</small>
                </div>
              </div>
            </div>

            {/* CHART AND BUDGET */}
            <div className="two-column-grid">

              <div className="panel spending-panel">
                <div className="panel-header">
                  <div>
                    <h3>Spending Overview</h3>
                    <p>Actual spending over the last 7 days</p>
                  </div>
                </div>

                <div className="chart-total">
                  <h2>{money(totalSpent)}</h2>
                  <span>Current month's recorded spending</span>
                </div>

                <div className="bar-chart">
                  {dailySpending.map(item => (
                    <div className="bar-column" key={item.date}>
                      <div className="bar-value">{money(item.amount)}</div>
                      <div className="bar-track">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(
                              item.amount > 0
                                ? (item.amount / maxDailySpending) * 100
                                : 0,
                              item.amount > 0 ? 5 : 0
                            )}%`
                          }}
                        />
                      </div>
                      <span>{item.day}</span>
                    </div>
                  ))}
                </div>

                <small style={{ color: "#999" }}>
                  Chart calculated from your saved transactions.
                </small>
              </div>

              {/* MONTHLY BUDGET PANEL */}
              <div className="panel budget-panel">
                <div className="panel-header">
                  <div>
                    <h3>Monthly Budget</h3>
                    <p>Your spending limit</p>
                  </div>
                  <CalendarDays size={19} className="muted-icon" />
                </div>

                <div className="budget-amount">
                  <h2>{money(totalSpent)}</h2>
                  <span>of {money(monthlyBudget)}</span>
                </div>

                <div className="progress-track large">
                  <div
                    className="progress-fill purple-fill"
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>

                <div className="budget-info">
                  <div>
                    <small>Spent</small>
                    <strong>{money(totalSpent)}</strong>
                  </div>

                  <div>
                    <small>Remaining</small>
                    <strong className="green-text">
                      {money(remainingBudget)}
                    </strong>
                  </div>
                </div>

                <div className="budget-note">
                  <Sparkles size={17} />
                  <span>
                    {totalSpent > monthlyBudget
                      ? "You have exceeded your monthly budget."
                      : "Keep tracking your expenses to stay within your budget."}
                  </span>
                </div>

                {/* UPDATE MONTHLY BUDGET */}
                <form onSubmit={saveMonthlyBudget} className="budget-edit-form">
                  <label htmlFor="monthly-budget-input">
                    Set monthly budget (₹)
                  </label>

                  <div style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "8px"
                  }}>
                    <input
                      id="monthly-budget-input"
                      type="number"
                      min="1"
                      step="0.01"
                      value={budgetInput}
                      onChange={event => setBudgetInput(event.target.value)}
                      required
                      style={{
                        minWidth: 0,
                        flex: 1,
                        padding: "10px",
                        border: "1px solid #d7dce5",
                        borderRadius: "8px"
                      }}
                    />

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={budgetSaving}
                    >
                      {budgetSaving ? "Saving..." : "Update"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* CATEGORIES AND SAVINGS */}
            <div className="two-column-grid">

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Expense Categories</h3>
                    <p>Actual category-wise spending this month</p>
                  </div>
                </div>

                <div className="category-list">
                  {categories.map(category => {
                    const Icon = category.icon;
                    const percentage = totalSpent > 0
                      ? (category.amount / totalSpent) * 100
                      : 0;

                    return (
                      <div className="category-row" key={category.name}>
                        <div
                          className="category-icon"
                          style={{
                            color: category.color,
                            background: `${category.color}18`
                          }}
                        >
                          <Icon size={19} />
                        </div>

                        <div className="category-details">
                          <div className="category-title">
                            <strong>{category.name}</strong>
                            <span>{money(category.amount)}</span>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${percentage}%`,
                                background: category.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="page-footer">
              StudentSpend AI · Manage money wisely, live sustainably.
            </footer>

          </div>

        ) : activeNav === "Transactions" ? (
          <div className="dashboard-content">
            <div className="welcome-row">
              <div>
                <h1>Transactions</h1>
                <p>Manage all your saved expenses.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowAdd(true)}
              >
                <Plus size={18} /> Add Transaction
              </button>
            </div>

            {apiError && (
              <div style={{
                padding: "12px",
                marginBottom: "16px",
                                background: "#ffe8e8",
                color: "#b42318",
                borderRadius: "8px"
              }}>
                {apiError}
              </div>
            )}

            <div className="panel transactions-panel">
              <div className="panel-header">
                <div>
                  <h3>All Transactions</h3>
                  <p>{transactions.length} recorded transactions</p>
                </div>
              </div>

              {loading ? (
                <p style={{ padding: "20px" }}>Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p style={{ padding: "20px" }}>No transactions found.</p>
              ) : (
                <div className="transaction-table">
                  <div className="table-heading">
                    <span>TRANSACTION</span>
                    <span>CATEGORY</span>
                    <span>DATE</span>
                    <span>AMOUNT</span>
                    <span>ACTION</span>
                  </div>

                  {transactions.map(transaction => {
                    const Icon = getCategoryIcon(transaction.category);

                    return (
                      <div className="transaction-row" key={transaction.id}>
                        <div className="transaction-name">
                          <div className="transaction-icon purple">
                            <Icon size={19} />
                          </div>
                          <strong>{transaction.name}</strong>
                        </div>

                        <span className="table-category">
                          {transaction.category}
                        </span>

                        <span className="table-date">
                          {formatDate(transaction.date)}
                        </span>

                        <strong className="expense-amount">
                          -{money(transaction.amount)}
                        </strong>

                        <button
                          className="more-button"
                          title="Delete transaction"
                          disabled={deletingId === transaction.id}
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          {deletingId === transaction.id
                            ? "..."
                            : <Trash2 size={17} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        ) : activeNav === "Budget & Expenses" ? (
          <div className="dashboard-content">
            <div className="welcome-row">
              <div>
                <h1>Budget & Expenses</h1>
                <p>Manage your monthly budget and track your spending.</p>
              </div>
            </div>

            {apiError && (
              <div style={{
                padding: "12px",
                marginBottom: "16px",
                background: "#ffe8e8",
                color: "#b42318",
                borderRadius: "8px"
              }}>
                {apiError}
              </div>
            )}

            <div className="summary-grid">
              <div className="summary-card">
                <p>Monthly Budget</p>
                <h2>{money(monthlyBudget)}</h2>
              </div>

              <div className="summary-card">
                <p>Total Spent</p>
                <h2>{money(totalSpent)}</h2>
              </div>

              <div className="summary-card">
                <p>Remaining Budget</p>
                <h2>{money(remainingBudget)}</h2>
              </div>
            </div>

            <div className="panel" style={{ marginTop: "24px", padding: "24px" }}>
              <div className="panel-header">
                <div>
                  <h3>Update Monthly Budget</h3>
                  <p>Set your spending limit for this month.</p>
                </div>
                <Target size={24} />
              </div>

              <form
                onSubmit={saveMonthlyBudget}
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "20px"
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Enter monthly budget"
                  required
                  style={{
                    flex: "1",
                    minWidth: "200px",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid #293b55",
                    background: "#0b1528",
                    color: "#ffffff"
                  }}
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={budgetSaving || budgetLoading}
                >
                  {budgetSaving ? "Saving..." : "Update Budget"}
                </button>
              </form>

              {budgetError && (
                <p style={{ color: "#ff7777", marginTop: "12px" }}>
                  {budgetError}
                </p>
              )}
            </div>

            <div className="panel" style={{ marginTop: "24px", padding: "24px" }}>
              <div className="panel-header">
                <div>
                  <h3>Budget Usage</h3>
                  <p>Your monthly spending progress.</p>
                </div>
                <Target size={24} />
              </div>

              <h2 style={{ marginTop: "20px" }}>
                {money(totalSpent)}{" "}
                <span style={{ fontSize: "15px", color: "#91a8ca" }}>
                  of {money(monthlyBudget)}
                </span>
              </h2>

              <div style={{
                height: "12px",
                background: "#26364e",
                borderRadius: "20px",
                overflow: "hidden",
                marginTop: "16px"
              }}>
                <div style={{
                  width: `${budgetPercentage}%`,
                  height: "100%",
                  background: budgetPercentage >= 100
                    ? "#ff6b6b"
                    : "linear-gradient(90deg, #8955df, #b58aff)",
                  borderRadius: "20px",
                  transition: "width 0.3s ease"
                }} />
              </div>

              <p style={{ color: "#91a8ca", marginTop: "10px" }}>
                {budgetPercentage.toFixed(1)}% of your budget used
              </p>

              {monthlyBudget > 0 && totalSpent > monthlyBudget && (
                <p style={{ color: "#ff7777", marginTop: "12px" }}>
                  You have exceeded your monthly budget!
                </p>
              )}
            </div>

            <div className="panel" style={{ marginTop: "24px", padding: "24px" }}>
              <div className="panel-header">
                <div>
                  <h3>Expense Breakdown</h3>
                  <p>Understand where your money is going this month.</p>
                </div>
              </div>

              {(() => {
                const currentMonth = new Date().toISOString().slice(0, 7);

                const categoryTotals = transactions
                  .filter(transaction =>
                    String(transaction.date).slice(0, 7) === currentMonth
                  )
                  .reduce((result, transaction) => {
                    const category = transaction.category || "Other";
                    result[category] =
                      (result[category] || 0) + Number(transaction.amount);
                    return result;
                  }, {});

                const categories = Object.entries(categoryTotals);

                return categories.length === 0 ? (
                  <p className="empty-message" style={{ marginTop: "20px" }}>
                    No expenses recorded this month.
                  </p>
                ) : (
                  <div style={{ marginTop: "20px" }}>
                    {categories.map(([category, amount]) => (
                      <div key={category} style={{ marginBottom: "20px" }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px"
                        }}>
                          <strong>{category}</strong>
                          <strong>{money(amount)}</strong>
                        </div>

                        <div style={{
                          height: "9px",
                          background: "#26364e",
                          borderRadius: "20px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${totalSpent > 0
                              ? Math.min((amount / totalSpent) * 100, 100)
                              : 0}%`,
                            height: "100%",
                            background: "#9b6bea",
                            borderRadius: "20px"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

        ) : activeNav === "Savings Goals" ? (
          <div className="dashboard-content">

            <div className="welcome-row">
              <div>
                <h1>My Savings Goals</h1>
                <p>Save consistently and achieve your financial goals.</p>
              </div>
            </div>

            {goalsError && (
              <div style={{
                padding: "12px",
                marginBottom: "16px",
                background: "#ffe8e8",
                color: "#b42318",
                borderRadius: "8px"
              }}>
                {goalsError}
              </div>
            )}

            {/* SUMMARY */}
            <div className="summary-grid">

              <div className="summary-card">
                <p>Total Goals</p>
                <h2>{savingsGoals.length}</h2>
              </div>

              <div className="summary-card">
                <p>Total Target</p>
                <h2>
                  {money(savingsGoals.reduce(
                    (sum, goal) => sum + Number(goal.target_amount),
                    0
                  ))}
                </h2>
              </div>

              <div className="summary-card">
                <p>Total Saved</p>
                <h2>
                  {money(savingsGoals.reduce(
                    (sum, goal) => sum + Number(goal.saved_amount),
                    0
                  ))}
                </h2>
              </div>

            </div>

            {/* ADD / EDIT GOAL FORM */}
            <div className="panel" style={{
              marginTop: "24px",
              padding: "24px"
            }}>

              <h3>{editingGoalId ? "Update Savings Goal" : "Create a Savings Goal"}</h3>

              <p style={{ color: "#91a8ca", marginTop: "6px" }}>
                Define your target and track how much you save.
              </p>

              <form
                onSubmit={saveSavingsGoal}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                  marginTop: "20px"
                }}
              >

                <div>
                  <label>Goal Name</label>
                  <input
                    value={goalTitle}
                    onChange={e => setGoalTitle(e.target.value)}
                    placeholder="e.g. Buy a Laptop"
                    maxLength={150}
                    required
                  />
                </div>

                <div>
                  <label>Target Amount (₹)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={goalTarget}
                    onChange={e => setGoalTarget(e.target.value)}
                    placeholder="Enter target amount"
                    required
                  />
                </div>

                <div>
                  <label>Amount Saved (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={goalSaved}
                    onChange={e => setGoalSaved(e.target.value)}
                    placeholder="Enter saved amount"
                    required
                  />
                </div>

                <div>
                  <label>Target Date (Optional)</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={e => setGoalDeadline(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Note (Optional)</label>
                  <input
                    value={goalNote}
                    onChange={e => setGoalNote(e.target.value)}
                    placeholder="Add a note about your goal"
                    maxLength={500}
                  />
                </div>

                <div style={{
                  display: "flex",
                  gap: "10px",
                  gridColumn: "1 / -1"
                }}>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={goalSaving}
                  >
                    {goalSaving
                      ? "Saving..."
                      : editingGoalId
                        ? "Update Goal"
                        : "Add Savings Goal"}
                  </button>

                  {editingGoalId && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        setEditingGoalId(null);
                        setGoalTitle("");
                        setGoalTarget("");
                        setGoalSaved("0");
                        setGoalDeadline("");
                        setGoalNote("");
                        setGoalsError("");
                      }}
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>
            </div>

            {/* SAVINGS GOALS LIST */}
            <div style={{ marginTop: "28px" }}>
              <h2>All Savings Goals</h2>

              {goalsLoading ? (
                <p style={{ marginTop: "20px" }}>Loading savings goals...</p>
              ) : savingsGoals.length === 0 ? (
                <div className="panel" style={{
                  marginTop: "16px",
                  padding: "30px",
                  textAlign: "center"
                }}>
                  <Target size={35} />
                  <h3 style={{ marginTop: "12px" }}>No savings goals yet</h3>
                  <p style={{ color: "#91a8ca" }}>
                    Create your first savings goal using the form above.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                  marginTop: "16px"
                }}>

                  {savingsGoals.map(goal => {
                    const target = Number(goal.target_amount);
                    const saved = Number(goal.saved_amount);
                    const percentage = target > 0
                      ? Math.min((saved / target) * 100, 100)
                      : 0;

                    return (
                      <div className="panel" key={goal.id} style={{
                        padding: "22px"
                      }}>

                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px"
                        }}>
                          <h3>{goal.title}</h3>
                          <Target size={22} color="#A77BFF" />
                        </div>

                        <h2 style={{ marginTop: "20px" }}>
                          {money(saved)}
                        </h2>

                        <p style={{ color: "#91a8ca" }}>
                          Saved of {money(target)}
                        </p>

                        <div style={{
                          height: "10px",
                          background: "#26364e",
                          borderRadius: "20px",
                          overflow: "hidden",
                          marginTop: "16px"
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #8955df, #b58aff)",
                            borderRadius: "20px"
                          }} />
                        </div>

                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "10px"
                        }}>
                          <strong style={{ color: "#B58AFF" }}>
                            {percentage.toFixed(1)}%
                          </strong>

                          <span style={{ color: "#91a8ca" }}>
                            {money(Math.max(target - saved, 0))} remaining
                          </span>
                        </div>

                        {goal.deadline && (
                          <p style={{
                            color: "#91a8ca",
                            marginTop: "14px"
                          }}>
                            Target date: {formatDate(goal.deadline)}
                          </p>
                        )}

                        {goal.note && (
                          <p style={{
                            color: "#91a8ca",
                            marginTop: "8px"
                          }}>
                            {goal.note}
                          </p>
                        )}

                        <div style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "20px"
                        }}>
                          <button
                            className="primary-button"
                            onClick={() => editSavingsGoal(goal)}
                          >
                            Edit
                          </button>

                          <button
                            className="primary-button"
                            onClick={() => deleteSavingsGoal(goal.id)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>

                      </div>
                    );
                  })}

                </div>
              )}
            </div>

          </div>
                  ) : activeNav === "Sustainability" ? (
          <div className="dashboard-content">
            <h1>Sustainability Dashboard</h1>
            <p>Track your spending and make eco-friendly choices.</p>

            {(() => {
              const total = transactions.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              );

              const otherSpending = transactions
                .filter(item => item.category === "Other")
                .reduce((sum, item) => sum + Number(item.amount || 0), 0);

              const ecoScore = total === 0
                ? 0
                : Math.round(100 - (otherSpending / total) * 100);

              return (
                <div style={{
                  background: "#102b25",
                  border: "1px solid #24634b",
                  borderRadius: "14px",
                  padding: "24px",
                  marginTop: "24px",
                  marginBottom: "24px"
                }}>
                  <h2 style={{ color: "#4ade80" }}>
                    🌱 Eco-Friendly Spending Score
                  </h2>

                  <h1 style={{
                    color: "#4ade80",
                    fontSize: "42px",
                    margin: "12px 0"
                  }}>
                    {ecoScore}/100
                  </h1>

                  <div style={{
                    height: "12px",
                    background: "#252b3a",
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: ecoScore + "%",
                      height: "100%",
                      background: "#4ade80",
                      borderRadius: "10px"
                    }} />
                  </div>

                  <p style={{ marginTop: "14px" }}>
                    This experimental score is based on spending outside
                    the Other category. It is not a verified environmental rating.
                  </p>
                </div>
              );
            })()}

            {/* SMART SUSTAINABILITY RECOMMENDATIONS */}
            {(() => {
              const totalSpending = transactions.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              );

              const categoryTotals = categoryOptions.map(category => ({
                name: category.name,
                amount: transactions
                  .filter(item => item.category === category.name)
                  .reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0
                  )
              }));

              const highestCategory = [...categoryTotals].sort(
                (a, b) => b.amount - a.amount
              )[0];

              const recommendations = {
                Food: "Plan your meals, avoid food waste and prefer reusable packaging.",
                Shopping: "Avoid impulse purchases and choose durable, reusable products.",
                Transport: "Prefer walking, cycling or public transport whenever possible.",
                Education: "Reuse books, notebooks and study materials to reduce waste.",
                Other: "Review your purchases and avoid unnecessary consumption."
              };

              return (
                <div className="panel" style={{
                  marginTop: "28px",
                  padding: "24px",
                  background: "#102b25",
                  border: "1px solid #24634b"
                }}>
                  <h2 style={{ color: "#4ade80", marginBottom: "18px" }}>
                    🌍 Smart Sustainability Recommendations
                  </h2>

                  {totalSpending === 0 ? (
                    <p>
                      Add your first transaction to receive personalized
                      sustainability recommendations.
                    </p>
                  ) : (
                    <>
                      <p style={{ marginBottom: "12px" }}>
                        <strong>Highest spending category:</strong>{" "}
                        {highestCategory?.name} – {money(highestCategory?.amount || 0)}
                      </p>

                      <p style={{ marginBottom: "12px" }}>
                        <strong>Your recommendation:</strong>{" "}
                        {recommendations[highestCategory?.name] || recommendations.Other}
                      </p>

                      <p>
                        <strong>Total tracked spending:</strong>{" "}
                        {money(totalSpending)}
                      </p>

                      <p style={{ color: "#4ade80", marginTop: "14px" }}>
                        💡 Small changes in daily spending can encourage
                        more sustainable consumption.
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

            <div className="stats-grid">
              <div className="stat-card">
                <p>Total Tracked Spending</p>
                <h2>
                  {money(
                    transactions.reduce(
                      (sum, item) => sum + Number(item.amount || 0),
                      0
                    )
                  )}
                </h2>
              </div>

              <div className="stat-card">
                <p>Total Purchases</p>
                <h2>{transactions.length}</h2>
              </div>

              <div className="stat-card">
                <p>Categories Used</p>
                <h2>
                  {new Set(transactions.map(item => item.category)).size}
                </h2>
              </div>
            </div>

            <div className="panel" style={{ marginTop: "28px", padding: "24px" }}>
              <h3>Spending by Category</h3>

              {categoryOptions.map(category => {
                const amount = transactions
                  .filter(item => item.category === category.name)
                  .reduce((sum, item) => sum + Number(item.amount || 0), 0);

                return (
                  <div key={category.name} style={{ marginBottom: "18px" }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px"
                    }}>
                      <span>{category.name}</span>
                      <strong>{money(amount)}</strong>
                    </div>

                    <div style={{
                      height: "9px",
                      background: "#252b3a",
                      borderRadius: "10px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${
                          transactions.reduce(
                            (sum, item) => sum + Number(item.amount || 0), 0
                          ) > 0
                            ? (amount / transactions.reduce(
                                (sum, item) => sum + Number(item.amount || 0), 0
                              )) * 100
                            : 0
                        }%`,
                        height: "100%",
                        background: category.color,
                        borderRadius: "10px"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="panel" style={{
              marginTop: "28px",
              padding: "24px",
              background: "#102b25",
              border: "1px solid #24634b"
            }}>
              <h3 style={{ color: "#4ade80" }}>
                🌱 Green Spending Tips
              </h3>

              {categoryOptions.map((category) => {
                const amount = transactions
                  .filter(item => item.category === category.name)
                  .reduce((sum, item) => sum + Number(item.amount || 0), 0);

                if (amount === 0) return null;

                const tips = {
                  Food: "Reduce food waste and prefer reusable packaging.",
                  Shopping: "Prefer reusable products and avoid unnecessary purchases.",
                  Transport: "Use public transport, cycling or walking whenever possible.",
                  Education: "Reuse books, notebooks and study materials.",
                  Other: "Choose durable products and avoid unnecessary consumption."
                };

                return (
                  <p key={category.name} style={{ marginBottom: "8px" }}>
                    🌱 {category.name}: {tips[category.name] || tips.Other}
                  </p>
                );
              })}
            </div>
          </div>

        ) : activeNav === "AI Assistant" ? (
          <div className="dashboard-content">
            <h1>AI Assistant</h1>
            <p>Your personal finance helper</p>

            <div className="panel assistant-panel">
              <div className="panel-header">
                <div>
                  <h3>AI Assistant</h3>
                  <p>Ask questions about your spending and budget</p>
                </div>
                <div className="stat-icon purple">
                  <Bot size={21} />
                </div>
              </div>

              <div className="assistant-message">
                <div className="assistant-avatar">
                  <Bot size={20} />
                </div>
                <p>
                  Hello! Ask me about your recorded spending and monthly budget.
                </p>
              </div>

              {answer && (
                <div className="assistant-answer">{answer}</div>
              )}

              <form className="assistant-input" onSubmit={askAssistant}>
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Ask about your expenses..."
                />

                <button type="submit">
                  <Send size={17} />
                </button>
              </form>

              <small className="demo-note">
                Basic database-based assistant · AI model integration pending
              </small>
            </div>
          </div>
                  ) : activeNav === "Settings" ? (
          <div className="dashboard-content">
            <div className="welcome-row">
              <div>
                <h1>Settings</h1>
                <p>Manage your account and application preferences.</p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Profile Settings</h3>
                  <p>Manage your personal information</p>
                </div>
                <Settings size={22} />
              </div>

              <div style={{ padding: "20px 0" }}>
                <div style={{ display: "grid", gap: "16px", maxWidth: "500px" }}>

                  <div>
                    <label>Account Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Enter your name"
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginTop: "8px",
                        borderRadius: "8px"
                      }}
                    />
                  </div>

                  <div>
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      placeholder="Enter your email"
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginTop: "8px",
                        borderRadius: "8px"
                      }}
                    />
                  </div>

                  <div>
                    <label>Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginTop: "8px",
                        borderRadius: "8px"
                      }}
                    >
                      <option value="Student">Student</option>
                      <option value="Professional">Professional</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => {
                      localStorage.setItem(
                        "studentSpendProfile",
                        JSON.stringify({
                          accountName,
                          accountEmail,
                          accountType,
                          currency
                        })
                      );
                      setProfileSaved(true);
                    }}
                  >
                    Save Profile
                  </button>

                  {profileSaved && (
                    <p style={{ color: "#4ade80" }}>
                      Profile saved successfully!
                    </p>
                  )}

                </div>
              </div>
            </div>

            <div className="panel" style={{ marginTop: "24px" }}>
              <h3>Application Preferences</h3>
              <p>Theme: Dark Mode</p>

              <div style={{ marginTop: "15px" }}>
                <label>Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </div>

            <div className="panel" style={{ marginTop: "24px" }}>
              <h3>Data Management</h3>
              <p>Manage your saved expense records.</p>

              <div style={{ marginTop: "20px" }}>
                <p>
                  Total Transactions: <strong>{transactions.length}</strong>
                </p>

                <button
                  className="primary-button"
                  onClick={() => {
                    if (transactions.length === 0) {
                      alert("No transactions available to export.");
                      return;
                    }

                    const headers = ["Title", "Amount", "Category", "Date", "Note"];

                    const rows = transactions.map((item) => [
                      item.name,
                      item.amount,
                      item.category,
                      item.date,
                      item.note || ""
                    ]);

                    const csvContent = [
                      headers,
                      ...rows
                    ]
                      .map(row =>
                        row.map(value =>
                          `"${String(value).replace(/"/g, '""')}"`
                        ).join(",")
                      )
                      .join("\n");

                    const blob = new Blob([csvContent], {
                      type: "text/csv;charset=utf-8;"
                    });

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");

                    link.href = url;
                    link.download = "StudentSpend_Transactions.csv";
                    link.click();

                    URL.revokeObjectURL(url);
                  }}
                >
                  Export Transactions (CSV)
                </button>

                <button
                  className="primary-button"
                  style={{
                    marginTop: "15px",
                    background: "#dc3545"
                  }}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to delete ALL expenses? This action cannot be undone."
                    );

                    if (!confirmed) return;

                    try {
                      const response = await fetch(`${API_URL}/expenses`, {
                        method: "DELETE"
                      });

                      if (!response.ok) {
                        throw new Error("Unable to delete expenses.");
                      }

                      await fetchExpenses();
                      alert("All expenses deleted successfully!");
                    } catch (error) {
                      alert(error.message);
                    }
                  }}
                >
                  Clear All Expenses
                </button>

              </div>
            </div>

          </div>
        ) : (
          <div className="dashboard-content">
            <h1>{activeNav}</h1>
            <p>This section is coming soon.</p>
          </div>
        )}

        </section>

        {/* ADD TRANSACTION MODAL */}
        {showAdd && (
          <div
            className="modal-overlay"
            onClick={() => setShowAdd(false)}
          >
            <div
              className="modal-box"
              onClick={event => event.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Add Transaction</h3>

                <button
                  className="icon-button"
                  onClick={() => setShowAdd(false)}
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={addTransaction}>
                <label>Transaction Name</label>
                <input
                  required
                  maxLength={150}
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  placeholder="e.g. Grocery shopping"
                />

                <label>Amount (₹)</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="Enter amount"
                />

                <label>Category</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                >
                  {categoryOptions.map(category => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label>Expense Date</label>
                <input
                  required
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                />

                <label>Note (Optional)</label>
                <input
                  maxLength={500}
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  placeholder="e.g. Lunch at college"
                />

                <button
                  type="submit"
                  className="primary-button modal-submit"
                  disabled={saving}
                >
                  <Plus size={18} />
                  {saving ? "Saving..." : "Save Transaction"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }


  // Delete a savings goal
  async function deleteSavingsGoal(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this savings goal?"
    );

    if (!confirmed) return;

    try {
      setGoalsError("");

      const response = await fetch(
        `${API_URL}/savings-goals/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Unable to delete savings goal.");
      }

      await fetchSavingsGoals();

    } catch (error) {
      console.error("Delete Savings Goal Error:", error);
      alert(error.message || "Unable to delete savings goal.");
    }
  }