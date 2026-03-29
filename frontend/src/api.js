// ================================================================
// API Service — Rust Backend + JWT Auth
// ================================================================
import { getToken, clearAuth } from "./auth.js";

const BASE = "/api";

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

  const data = await res.json();
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
export const createMember = (body)      => api.post("/members", body);
export const updateMember = (id, body)  => api.put(`/members/${id}`, body);
export const deleteMember = (id)        => api.delete(`/members/${id}`);

// ── Accounts ───────────────────────────────────────────────
export const getAccounts   = (type="")  => api.get(`/accounts${type && type !== "all" ? `?type=${type}` : ""}`);
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
export const getCollectionSummary = (year) =>
    api.get(`/accounts/collection-summary?year=${year}`);