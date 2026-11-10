"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Wallet, Receipt, Target, Leaf, Bot,
  Settings, CircleHelp, Search, Bell, Plus, ArrowUpRight,
  ArrowDownRight, ShoppingBag, Bus, BookOpen,
  MoreHorizontal, CalendarDays, X, Send, Menu,
  Sparkles, PiggyBank, Coffee, GraduationCap, Trash2
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";
const DEFAULT_MONTHLY_BUDGET = 0;

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

  const [showAdd, setShowAdd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState(localDateString());
  const [expenseNote, setExpenseNote] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // Fetch expenses from backend.
  const fetchExpenses = useCallback(async () => {
    try {
      setApiError("");

      const response = await fetch(`${API_URL}/expenses`);

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
        "Unable to load expenses. Check that FastAPI is running at http://127.0.0.1:8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current month's budget.
  const fetchMonthlyBudget = useCallback(async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    try {
      const response = await fetch(
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

  useEffect(() => {
    fetchExpenses();
    fetchMonthlyBudget();
  }, [fetchExpenses, fetchMonthlyBudget]);

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

      const response = await fetch(url, {
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
      const response = await fetch(`${API_URL}/expenses`, {
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
      const response = await fetch(`${API_URL}/expenses/${id}`, {
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

    if (!question.trim()) return;

    setAnswer(
      `Your recorded spending this month is ${money(totalSpent)}. ` +
      `Your monthly budget is ${money(monthlyBudget)}. ` +
      `You have ${money(remainingBudget)} remaining.`
    );

    setQuestion("");
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
          <button className="nav-item">
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

              <div className="panel savings-panel">
                <div className="panel-header">
                  <div>
                    <h3>Savings Goals</h3>
                    <p>Set goals to track your progress</p>
                  </div>
                  <Target size={20} className="muted-icon" />
                </div>

                <div style={{ padding: "24px 0" }}>
                  <div className="goal-icon purple">
                    <GraduationCap size={25} />
                  </div>
                  <h3>No savings goals added</h3>
                  <p>
                    Your savings goals will appear here after you add
                    their target amounts and saved amounts.
                  </p>
                </div>
              </div>
            </div>
                        {/* SUSTAINABILITY AND ASSISTANT */}
            <div className="two-column-grid">

              <div className="panel sustainability-panel">
                <div className="panel-header">
                  <div>
                    <h3>Sustainability Dashboard</h3>
                    <p>Track the environmental impact of your purchases</p>
                  </div>
                  <div className="stat-icon green">
                    <Leaf size={20} />
                  </div>
                </div>

                <div style={{ padding: "24px 0" }}>
                  <h3>Environmental data not available yet</h3>
                  <p>
                    We will show environmental estimates after adding
                    product-level sustainability data and calculation rules.
                  </p>
                </div>
              </div>

              <div className="panel assistant-panel">
                <div className="panel-header">
                  <div>
                    <h3>AI Assistant</h3>
                    <p>Your personal finance helper</p>
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

            {/* RECENT TRANSACTIONS */}
            <div className="panel transactions-panel">
              <div className="panel-header">
                <div>
                  <h3>Transactions</h3>
                  <p>Expenses saved in your database</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setShowAdd(true)}
                >
                  Add new
                </button>
              </div>

              {loading ? (
                <p style={{ padding: "20px" }}>Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p style={{ padding: "20px" }}>
                  No expenses found. Click Add Transaction to record your first expense.
                </p>
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