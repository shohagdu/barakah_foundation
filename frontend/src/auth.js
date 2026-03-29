// ================================================================
// Auth helpers — token storage & API calls
// ================================================================

const TOKEN_KEY = "bmf_token";
const USER_KEY  = "bmf_user";

// ── Storage ───────────────────────────────────────────────
export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
};

export const isLoggedIn = () => !!getToken();

// ── API calls ─────────────────────────────────────────────
const BASE = "/api/auth";

const authReq = async (url, body) => {
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

export const apiLogin    = (email, password) =>
  authReq(`${BASE}/login`, { email, password });

export const apiRegister = (payload) =>
  authReq(`${BASE}/register`, payload);

export const apiMe = async () => {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return res.json();
};

// ── Role helpers ──────────────────────────────────────────
export const ROLES = {
  admin:      { label: "অ্যাডমিন",    color: "var(--danger)"  },
  accountant: { label: "হিসাবরক্ষক",  color: "#8b5cf6"        },
  member:     { label: "সদস্য",        color: "var(--primary)" },
  viewer:     { label: "দর্শক",        color: "var(--muted)"   },
};

export const hasRole = (user, ...roles) =>
  user && roles.includes(user.role);

export const canEdit = (user) =>
  hasRole(user, "admin", "accountant");

export const isAdmin = (user) =>
  hasRole(user, "admin");
