import { useState, useEffect } from "react";
import { Modal, Field, Btn, Toast, useToast } from "../components.jsx";
import {
  getExpenseCategories, createExpenseCategory,
  updateExpenseCategory, deleteExpenseCategory,
} from "../api.js";

const EMPTY = { name: "", nameBn: "", parentId: "", accountId: "" };

function CatForm({ init, onSave, onClose }) {
  const [form,    setForm]    = useState(init || EMPTY);
  const [loading, setLoading] = useState(false);

  const inp = {
    border: "1.5px solid var(--border)", borderRadius: 8, padding: "9px 12px",
    fontFamily: "inherit", fontSize: "0.875rem", color: "var(--text)", width: "100%",
  };
  const lbl = { fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" };

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={lbl}>নাম (English) *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp} required />
        </div>
        <div>
          <label style={lbl}>নাম (বাংলা)</label>
          <input value={form.nameBn || ""} onChange={e => setForm(p => ({ ...p, nameBn: e.target.value }))} style={inp} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1rem" }}>
        <button type="button" onClick={onClose}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "var(--muted)" }}>
          বাতিল
        </button>
        <button type="submit" disabled={loading}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
          {loading ? "..." : "সংরক্ষণ"}
        </button>
      </div>
    </form>
  );
}

export default function ExpenseCategories() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | "add" | {edit: cat}
  const [toast,   showToast]  = useToast();

  const load = async () => {
    setLoading(true);
    try { setCats(await getExpenseCategories()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doSave = async form => {
    try {
      if (modal?.edit) {
        await updateExpenseCategory(modal.edit.id, form);
        showToast("ক্যাটাগরি আপডেট হয়েছে");
      } else {
        await createExpenseCategory(form);
        showToast("ক্যাটাগরি যোগ হয়েছে");
      }
      setModal(null);
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const doToggle = async (cat) => {
    try {
      if (cat.isActive) {
        await deleteExpenseCategory(cat.id);
        showToast("ক্যাটাগরি নিষ্ক্রিয় করা হয়েছে");
      } else {
        await updateExpenseCategory(cat.id, { ...cat, isActive: 1 });
        showToast("ক্যাটাগরি সক্রিয় করা হয়েছে");
      }
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const card = { background: "var(--card)", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid var(--border)" };

  return (
    <div>
      <Toast toast={toast} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>খরচের ক্যাটাগরি</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>মোট {cats.length} টি ক্যাটাগরি</p>
        </div>
        <button onClick={() => setModal("add")}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem" }}>
          + নতুন ক্যাটাগরি
        </button>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>লোড হচ্ছে...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["আইডি", "নাম (English)", "নাম (বাংলা)", "অবস্থা", "কার্যক্রম"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map(cat => (
                <tr key={cat.id} style={{ borderBottom: "1px solid var(--border)", opacity: cat.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--muted)" }}>#{cat.id}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{cat.name}</td>
                  <td style={{ padding: "10px 12px" }}>{cat.nameBn || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                      background: cat.isActive ? "#dcfce7" : "#fee2e2",
                      color: cat.isActive ? "#15803d" : "#dc2626",
                    }}>{cat.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setModal({ edit: cat })}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}>
                        ✏️ সম্পাদনা
                      </button>
                      <button onClick={() => doToggle(cat)}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit", fontWeight: 600,
                          background: cat.isActive ? "#fee2e2" : "#dcfce7",
                          color: cat.isActive ? "#dc2626" : "#15803d" }}>
                        {cat.isActive ? "নিষ্ক্রিয়" : "সক্রিয়"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === "add" ? "নতুন ক্যাটাগরি" : "ক্যাটাগরি সম্পাদনা"}
          onClose={() => setModal(null)}
        >
          <CatForm
            init={modal?.edit ? { name: modal.edit.name, nameBn: modal.edit.nameBn, accountId: modal.edit.accountId } : null}
            onSave={doSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
