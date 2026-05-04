import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal, Field, Textarea, Btn, Badge, Toast,
  useToast, fmtMoney,
} from "../components.jsx";
import {
  getExpenses, getExpenseSummary, approveExpense, rejectExpense, deleteExpense,
  getExpenseCategories,
} from "../api.js";
import { getStoredUser } from "../auth.js";

// ── Helpers ────────────────────────────────────────────────────
const fmtDDMMYYYY = d => {
  if (!d) return "—";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

const STATUS_MAP = {
  pending:  { color: "#b45309", bg: "#fef3c7", label: "অপেক্ষায়" },
  approved: { color: "#15803d", bg: "#dcfce7", label: "অনুমোদিত" },
  rejected: { color: "#dc2626", bg: "#fee2e2", label: "প্রত্যাখ্যাত" },
};
const PM_MAP = {
  cash:           "নগদ",
  bank:           "ব্যাংক",
  mobile_banking: "মোবাইল ব্যাংকিং",
};

const StatusBadge = ({ s }) => {
  const m = STATUS_MAP[s] || { color: "var(--muted)", bg: "#f1f5f9", label: s || "—" };
  return (
    <span style={{
      background: m.bg, color: m.color,
      padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
    }}>{m.label}</span>
  );
};

const ModalActions = ({ children }) => (
  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1.2rem" }}>
    {children}
  </div>
);

// ── Approve Confirm Modal ──────────────────────────────────────
function ApproveModal({ expense, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <Modal title="খরচ অনুমোদন" onClose={onClose}>
      <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
        <p style={{ color: "var(--text)", lineHeight: 1.7, fontSize: "0.9rem" }}>
          এই খরচটি অনুমোদন করলে স্বয়ংক্রিয়ভাবে ডবল-এন্ট্রি লেনদেন তৈরি হবে।
        </p>
        <p style={{ marginTop: 8, fontWeight: 800, fontSize: "1.05rem", color: "var(--danger)" }}>
          পরিমাণ: {fmtMoney(expense.amount)}
        </p>
        <p style={{ marginTop: 4, fontSize: "0.82rem", color: "var(--muted)" }}>
          ক্যাটাগরি: {expense.category} | {expense.description}
        </p>
      </div>
      <ModalActions>
        <Btn variant="muted" onClick={onClose}>বাতিল</Btn>
        <Btn variant="success" onClick={go} loading={loading}>অনুমোদন করুন ✓</Btn>
      </ModalActions>
    </Modal>
  );
}

// ── Reject Modal ───────────────────────────────────────────────
function RejectModal({ onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
  };
  return (
    <Modal title="খরচ প্রত্যাখ্যান" onClose={onClose}>
      <Field label="প্রত্যাখ্যানের কারণ" required>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="কারণ লিখুন..." />
      </Field>
      <ModalActions>
        <Btn variant="muted" onClick={onClose}>বাতিল</Btn>
        <Btn variant="danger" onClick={go} loading={loading} disabled={!reason.trim()}>
          প্রত্যাখ্যান করুন ✗
        </Btn>
      </ModalActions>
    </Modal>
  );
}

// ── View Detail Modal ──────────────────────────────────────────
function ViewModal({ exp, onClose }) {
  if (!exp) return null;
  const Row = ({ label, val }) => (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 160, color: "var(--muted)", fontSize: "0.82rem", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{val || "—"}</span>
    </div>
  );
  return (
    <Modal title="খরচের বিবরণ" onClose={onClose} wide>
      <Row label="তারিখ"       val={fmtDDMMYYYY(exp.expenseDate)} />
      <Row label="ক্যাটাগরি"   val={exp.category} />
      <Row label="সাব-ক্যাটাগরি" val={exp.subCategory} />
      <Row label="বিবরণ"       val={exp.description} />
      <Row label="পরিমাণ"      val={fmtMoney(exp.amount)} />
      <Row label="পরিশোধ"      val={PM_MAP[exp.paymentMethod] || exp.paymentMethod} />
      <Row label="ব্যাংক"       val={exp.bankName} />
      <Row label="রেফারেন্স"   val={exp.reference} />
      <Row label="নোট"          val={exp.notes} />
      <Row label="অবস্থা"       val={<StatusBadge s={exp.status} />} />
      <Row label="তৈরি করেছেন" val={exp.creatorName} />
      {exp.approverName && <Row label="অনুমোদনকারী" val={exp.approverName} />}
      {exp.rejectionReason && <Row label="প্রত্যাখ্যানের কারণ" val={exp.rejectionReason} />}
      {exp.receiptImage && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 6 }}>রসিদ</div>
          <img src={`/uploads/${exp.receiptImage}`} alt="receipt"
            style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
        </div>
      )}
    </Modal>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function Expenses() {
  const navigate = useNavigate();
  const user     = getStoredUser();
  const canManage = user?.role === "admin" || user?.role === "accountant";
  const isAdmin   = user?.role === "admin";

  const [data,        setData]       = useState([]);
  const [summary,     setSummary]    = useState({});
  const [categories,  setCats]       = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [totalCount,  setTotal]      = useState(0);
  const [totalPages,  setTotalPages] = useState(1);
  const [page,        setPage]       = useState(1);

  const [filters, setFilters] = useState({
    from: "", to: "", category: "", status: "", search: "",
  });

  const [viewExp,    setViewExp]    = useState(null);
  const [approveExp, setApproveExp] = useState(null);
  const [rejectId,   setRejectId]   = useState(null);
  const [toast, showToast] = useToast();

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page: pg, limit: 10 };
      const [res, sum] = await Promise.all([
        getExpenses(params),
        getExpenseSummary(),
      ]);
      setData(res.data || []);
      setTotal(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
      setSummary(sum);
      setPage(pg);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1); }, [filters]);
  useEffect(() => {
    getExpenseCategories().then(c => setCats(c || [])).catch(() => {});
  }, []);

  const doApprove = async () => {
    try {
      await approveExpense(approveExp.id);
      showToast("খরচ অনুমোদিত এবং লেনদেন তৈরি হয়েছে");
      setApproveExp(null);
      load(page);
    } catch (e) { showToast(e.message, "error"); }
  };

  const doReject = async (reason) => {
    try {
      await rejectExpense(rejectId, { reason });
      showToast("খরচ প্রত্যাখ্যাত হয়েছে");
      setRejectId(null);
      load(page);
    } catch (e) { showToast(e.message, "error"); }
  };

  const doDelete = async (id) => {
    if (!window.confirm("এই খরচটি মুছে দিতে চান?")) return;
    try {
      await deleteExpense(id);
      showToast("খরচ মুছে ফেলা হয়েছে");
      load(page);
    } catch (e) { showToast(e.message, "error"); }
  };

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const card = { background: "var(--card)", borderRadius: 12, padding: "1.2rem 1.4rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid var(--border)" };

  return (
    <div>
      <Toast toast={toast} />

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>খরচের তালিকা</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>মোট {totalCount} টি খরচ</p>
        </div>
        <Btn onClick={() => navigate("/expenses/new")}>+ খরচ যোগ করুন</Btn>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "এই মাসের মোট খরচ",  val: fmtMoney(summary.totalThisMonth), color: "var(--danger)" },
          { label: "গত মাসের খরচ",        val: fmtMoney(summary.totalLastMonth), color: "var(--muted)" },
          { label: "এই বছরের মোট",        val: fmtMoney(summary.totalThisYear),  color: "var(--primary)" },
          { label: "অনুমোদন অপেক্ষায়",   val: `${summary.pendingCount || 0} টি`, color: "var(--gold)" },
        ].map(c => (
          <div key={c.label} style={card}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ ...card, marginBottom: "1.2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>শুরুর তারিখ</label>
          <input type="date" value={filters.from} onChange={e => setF("from", e.target.value)}
            style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: "0.875rem" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>শেষ তারিখ</label>
          <input type="date" value={filters.to} onChange={e => setF("to", e.target.value)}
            style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: "0.875rem" }} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>ক্যাটাগরি</label>
          <select value={filters.category} onChange={e => setF("category", e.target.value)}
            style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: "0.875rem", minWidth: 160 }}>
            <option value="">সব ক্যাটাগরি</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.nameBn || c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>অবস্থা</label>
          <select value={filters.status} onChange={e => setF("status", e.target.value)}
            style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: "0.875rem" }}>
            <option value="">সব অবস্থা</option>
            <option value="pending">অপেক্ষায়</option>
            <option value="approved">অনুমোদিত</option>
            <option value="rejected">প্রত্যাখ্যাত</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4 }}>খুঁজুন</label>
          <input value={filters.search} onChange={e => setF("search", e.target.value)}
            placeholder="বিবরণ / রেফারেন্স..."
            style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontFamily: "inherit", fontSize: "0.875rem", width: "100%" }} />
        </div>
        <Btn variant="outline" onClick={() => setFilters({ from:"", to:"", category:"", status:"", search:"" })}>রিসেট</Btn>
      </div>

      {/* ── Table ── */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>লোড হচ্ছে...</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>কোনো খরচ পাওয়া যায়নি</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["তারিখ","ক্যাটাগরি","বিবরণ","পরিমাণ","পরিশোধ পদ্ধতি","অবস্থা","কার্যক্রম"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(exp => (
                  <tr key={exp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: "0.875rem", whiteSpace: "nowrap" }}>{fmtDDMMYYYY(exp.expenseDate)}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.875rem" }}>{exp.category}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.875rem", maxWidth: 200 }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.description}</div>
                      {exp.subCategory && <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{exp.subCategory}</div>}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.875rem", fontWeight: 700, color: "var(--danger)", whiteSpace: "nowrap" }}>{fmtMoney(exp.amount)}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.875rem" }}>{PM_MAP[exp.paymentMethod] || exp.paymentMethod}</td>
                    <td style={{ padding: "10px 12px" }}><StatusBadge s={exp.status} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                        <button onClick={() => setViewExp(exp)} title="দেখুন"
                          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem" }}>👁</button>
                        {exp.status === "pending" && (
                          <button onClick={() => navigate(`/expenses/${exp.id}/edit`)} title="সম্পাদনা"
                            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>
                        )}
                        {canManage && exp.status === "pending" && <>
                          <button onClick={() => setApproveExp(exp)}
                            style={{ background: "#dcfce7", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#15803d", fontWeight: 700 }}>✓ অনুমোদন</button>
                          <button onClick={() => setRejectId(exp.id)}
                            style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem", color: "#dc2626", fontWeight: 700 }}>✗ প্রত্যাখ্যান</button>
                        </>}
                        {isAdmin && exp.status !== "approved" && (
                          <button onClick={() => doDelete(exp.id)} title="মুছুন"
                            style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem" }}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: "1rem", padding: "0.5rem 0" }}>
            <button onClick={() => load(page - 1)} disabled={page <= 1}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "none", cursor: page <= 1 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              ‹ আগে
            </button>
            <span style={{ padding: "6px 14px", color: "var(--muted)", fontSize: "0.875rem" }}>{page} / {totalPages}</span>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "none", cursor: page >= totalPages ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              পরে ›
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {viewExp    && <ViewModal exp={viewExp} onClose={() => setViewExp(null)} />}
      {approveExp && <ApproveModal expense={approveExp} onConfirm={doApprove} onClose={() => setApproveExp(null)} />}
      {rejectId   && <RejectModal onConfirm={doReject} onClose={() => setRejectId(null)} />}
    </div>
  );
}
