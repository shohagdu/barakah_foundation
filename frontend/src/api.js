// ================================================================
// API Service — Rust Backend + JWT Auth
// ================================================================
import { getToken, clearAuth } from "./auth.js";

const BASE = import.meta.env.VITE_API_BASE || "/api";

const req = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  // Token expired → logout
  if (res.status === 401) {
    clearAuth();
    window.location.reload();
    throw new Error("Session expired. Please login again.");
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const api = {
  get:    (url)       => req(url),
  post:   (url, body) => req(url, { method: "POST",   body: JSON.stringify(body) }),
  put:    (url, body) => req(url, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (url)       => req(url, { method: "DELETE" }),
};

// ── Dashboard ──────────────────────────────────────────────
export const getDashboard = ()          => api.get("/dashboard");
export const getHealth    = ()          => api.get("/health");

// ── Members ────────────────────────────────────────────────
export const getMembers   = (search="") => api.get(`/members${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const getMember    = (id)        => api.get(`/members/${id}`);
export const createMember = (body)      => api.post("/members", body);
export const updateMember = (id, body)  => api.put(`/members/${id}`, body);
export const deleteMember = (id)        => api.delete(`/members/${id}`);

// ── File Upload ────────────────────────────────────────────
export const uploadFile = async (file) => {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: fd,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error("Invalid server response"); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

// ── Accounts ───────────────────────────────────────────────
// পুরনো line replace করুন:
export const getAccounts = (param = "") => api.get(`/accounts${param}`);
export const createAccount = (body)     => api.post("/accounts", body);
export const updateAccount = (id, body) => api.put(`/accounts/${id}`, body);
export const deleteAccount = (id)       => api.delete(`/accounts/${id}`);

// ── Donations ──────────────────────────────────────────────
export const getDonations   = (search="") => api.get(`/donations${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const createDonation = (body)      => api.post("/donations", body);
export const updateDonation = (id, body)  => api.put(`/donations/${id}`, body);
export const deleteDonation = (id)        => api.delete(`/donations/${id}`);

// ── Projects ───────────────────────────────────────────────
export const getProjects   = ()          => api.get("/projects");
export const createProject = (body)      => api.post("/projects", body);
export const updateProject = (id, body)  => api.put(`/projects/${id}`, body);
export const deleteProject = (id)        => api.delete(`/projects/${id}`);

// ── Beneficiaries ──────────────────────────────────────────
export const getBeneficiaries  = (search="") => api.get(`/beneficiaries${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const createBeneficiary = (body)      => api.post("/beneficiaries", body);
export const updateBeneficiary = (id, body)  => api.put(`/beneficiaries/${id}`, body);
export const deleteBeneficiary = (id)        => api.delete(`/beneficiaries/${id}`);

// ── Meetings ───────────────────────────────────────────────
export const getMeetings   = ()          => api.get("/meetings");
export const createMeeting = (body)      => api.post("/meetings", body);
export const updateMeeting = (id, body)  => api.put(`/meetings/${id}`, body);
export const deleteMeeting = (id)        => api.delete(`/meetings/${id}`);


export const getBankAccounts = () => api.get("/bank-accounts");

// ── Reports ─────────────────────────────────────────────────
const qs = p => { const s = new URLSearchParams(Object.entries(p).filter(([,v]) => v)).toString(); return s ? `?${s}` : ""; };
export const getReportProfitLoss   = (from, to)   => api.get(`/reports/profit-loss${qs({from,to})}`);
export const getReportCashFlow     = (from, to)   => api.get(`/reports/cash-flow${qs({from,to})}`);
export const getReportBalanceSheet = ()           => api.get("/reports/balance-sheet");
export const getReportTrialBalance = ()           => api.get("/reports/trial-balance");
export const getMemberReport       = (p={})       => api.get(`/member-report${qs(p)}`);
export const getMemberWiseReport   = (p={})       => api.get(`/member-wise-report${qs(p)}`);
export const getDepositSummary     = (p={})       => api.get(`/member-deposits/summary${qs(p)}`);
export const getUnpaidDeposits     = ()           => api.get("/member-deposits/unpaid");
export const getMemberFines        = (p={})       => api.get(`/member-fines${qs(p)}`);
export const createMemberFine      = (body)       => api.post("/member-fines", body);
export const payMemberFine         = (id)         => api.put(`/member-fines/${id}/pay`, {});

// ── Settings: Chart of Accounts ────────────────────────────
export const getChartOfAccounts    = ()          => api.get("/settings/chart-of-accounts");
export const createChartOfAccount  = (body)      => api.post("/settings/chart-of-accounts", body);
export const updateChartOfAccount  = (id, body)  => api.put(`/settings/chart-of-accounts/${id}`, body);
export const deleteChartOfAccount  = (id)        => api.delete(`/settings/chart-of-accounts/${id}`);
export const approveChartOfAccount = (id)        => api.post(`/settings/chart-of-accounts/${id}/approve`, {});

// ── Expenses ──────────────────────────────────────────────────
export const getExpenses           = (p={})       => api.get(`/expenses${qs(p)}`);
export const getExpenseSummary     = ()            => api.get("/expenses/summary");
export const getExpense            = (id)          => api.get(`/expenses/${id}`);
export const createExpense         = (body)        => api.post("/expenses", body);
export const updateExpense         = (id, body)    => api.put(`/expenses/${id}`, body);
export const deleteExpense         = (id)          => api.delete(`/expenses/${id}`);
export const approveExpense        = (id)          => api.post(`/expenses/${id}/approve`, {});
export const rejectExpense         = (id, body)    => api.post(`/expenses/${id}/reject`, body);

export const getExpenseCategories  = ()            => api.get("/expense-categories");
export const createExpenseCategory = (body)        => api.post("/expense-categories", body);
export const updateExpenseCategory = (id, body)    => api.put(`/expense-categories/${id}`, body);
export const deleteExpenseCategory = (id)          => api.delete(`/expense-categories/${id}`);

export const getExpenseReportSummary = (p={})      => api.get(`/reports/expense-summary${qs(p)}`);
export const getExpenseReportDetail  = (p={})      => api.get(`/reports/expense-detail${qs(p)}`);

export const getBankStatement = (p={})             => api.get(`/reports/bank-statement${qs(p)}`);

// ── Collections ─────────────────────────────────────────────
export const getCollections   = (p={})       => api.get(`/collections${qs(p)}`);
export const createCollection = (body)       => api.post("/collections", body);
export const deleteCollection = (id)         => api.delete(`/collections/${id}`);

// ── Settings: Bank Accounts ─────────────────────────────────
export const getSettingsBanks   = ()          => api.get("/settings/bank-accounts");
export const createSettingsBank = (body)      => api.post("/settings/bank-accounts", body);
export const updateSettingsBank = (id, body)  => api.put(`/settings/bank-accounts/${id}`, body);
export const deleteSettingsBank = (id)        => api.delete(`/settings/bank-accounts/${id}`);