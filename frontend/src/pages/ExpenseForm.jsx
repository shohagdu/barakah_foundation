import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Field, Input, Select, Textarea, Btn, Modal,
  FormGrid, FormActions, Toast, useToast, today,
} from "../components.jsx";
import {
  getExpenseCategories, createExpense, updateExpense, getExpense,
  getSettingsBanks, uploadFile,
} from "../api.js";

const EMPTY = {
  expenseDate:   today(),
  category:      "",
  subCategory:   "",
  description:   "",
  amount:        "",
  paymentMethod: "cash",
  bankAccountId: "",
  accountId:     1,
  reference:     "",
  receiptImage:  "",
  notes:         "",
};

export default function ExpenseForm() {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const isEdit      = Boolean(id);

  const [form,       setForm]     = useState(EMPTY);
  const [categories, setCats]     = useState([]);
  const [banks,      setBanks]    = useState([]);
  const [loading,    setLoading]  = useState(false);
  const [uploading,  setUploading]= useState(false);
  const [toast,      showToast]   = useToast();

  useEffect(() => {
    getExpenseCategories().then(c => setCats(c.filter(x => x.isActive !== 0))).catch(() => {});
    getSettingsBanks().then(b => setBanks(b || [])).catch(() => {});
    if (isEdit) {
      getExpense(id).then(d => setForm({
        expenseDate:   d.expenseDate?.split("T")[0] || today(),
        category:      d.category || "",
        subCategory:   d.subCategory || "",
        description:   d.description || "",
        amount:        d.amount || "",
        paymentMethod: d.paymentMethod || "cash",
        bankAccountId: d.bankAccountId || "",
        accountId:     d.accountId || 1,
        reference:     d.reference || "",
        receiptImage:  d.receiptImage || "",
        notes:         d.notes || "",
      })).catch(() => showToast("খরচ লোড করা যায়নি", "error"));
    }
  }, [id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleReceipt = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      set("receiptImage", res.filename || res.url || "");
      showToast("রসিদ আপলোড সম্পন্ন");
    } catch (err) { showToast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.category)    return showToast("ক্যাটাগরি নির্বাচন করুন", "error");
    if (!form.description) return showToast("বিবরণ দিন", "error");
    if (!form.amount || Number(form.amount) <= 0) return showToast("সঠিক পরিমাণ দিন", "error");

    const payload = {
      expenseDate:   form.expenseDate,
      category:      form.category,
      subCategory:   form.subCategory || null,
      description:   form.description,
      amount:        parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
      bankAccountId: form.paymentMethod === "cash" ? null : (form.bankAccountId ? parseInt(form.bankAccountId) : null),
      accountId:     form.accountId || 1,
      reference:     form.reference || null,
      receiptImage:  form.receiptImage || null,
      notes:         form.notes || null,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await updateExpense(id, payload);
        showToast("খরচ আপডেট হয়েছে");
      } else {
        await createExpense(payload);
        showToast("খরচ জমা দেওয়া হয়েছে");
      }
      setTimeout(() => navigate("/expenses"), 1000);
    } catch (err) { showToast(err.message, "error"); }
    finally { setLoading(false); }
  };

  const inp = {
    border: "1.5px solid var(--border)", borderRadius: 8, padding: "9px 12px",
    fontFamily: "inherit", fontSize: "0.875rem", color: "var(--text)", width: "100%",
    background: "var(--card)",
  };
  const lbl = { fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Toast toast={toast} />

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
          {isEdit ? "খরচ সম্পাদনা" : "নতুন খরচ যোগ করুন"}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>
          {isEdit ? "শুধুমাত্র অপেক্ষামান খরচ সম্পাদনা করা যাবে" : "নতুন খরচের তথ্য পূরণ করুন"}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "var(--card)", borderRadius: 14, padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,.07)", border: "1px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Date */}
          <div>
            <label style={lbl}>তারিখ *</label>
            <input type="date" value={form.expenseDate} onChange={e => set("expenseDate", e.target.value)} style={inp} required />
          </div>

          {/* Category */}
          <div>
            <label style={lbl}>ক্যাটাগরি *</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={inp} required>
              <option value="">ক্যাটাগরি নির্বাচন করুন</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.nameBn || c.name}</option>
              ))}
            </select>
          </div>

          {/* Sub Category */}
          <div>
            <label style={lbl}>সাব-ক্যাটাগরি</label>
            <input value={form.subCategory} onChange={e => set("subCategory", e.target.value)} style={inp} placeholder="ঐচ্ছিক" />
          </div>

          {/* Amount */}
          <div>
            <label style={lbl}>পরিমাণ (৳) *</label>
            <input type="number" step="0.01" min="0" value={form.amount}
              onChange={e => set("amount", e.target.value)} style={inp} placeholder="0.00" required />
          </div>

          {/* Description — full width */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>বিবরণ *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder="খরচের বিস্তারিত বিবরণ..." required />
          </div>

          {/* Payment Method */}
          <div>
            <label style={lbl}>পরিশোধ পদ্ধতি</label>
            <select value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} style={inp}>
              <option value="cash">নগদ</option>
              <option value="bank">ব্যাংক</option>
              <option value="mobile_banking">মোবাইল ব্যাংকিং</option>
            </select>
          </div>

          {/* Bank Account — shown only if not cash */}
          {form.paymentMethod !== "cash" && (
            <div>
              <label style={lbl}>ব্যাংক একাউন্ট</label>
              <select value={form.bankAccountId} onChange={e => set("bankAccountId", e.target.value)} style={inp}>
                <option value="">নির্বাচন করুন</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reference */}
          <div>
            <label style={lbl}>রেফারেন্স</label>
            <input value={form.reference} onChange={e => set("reference", e.target.value)} style={inp} placeholder="ঐচ্ছিক" />
          </div>

          {/* Receipt Upload */}
          <div>
            <label style={lbl}>রসিদ আপলোড {uploading && "— আপলোড হচ্ছে..."}</label>
            <input type="file" accept="image/*" onChange={handleReceipt}
              style={{ ...inp, padding: "7px 10px" }} />
            {form.receiptImage && (
              <div style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--success)" }}>✓ {form.receiptImage}</div>
            )}
          </div>

          {/* Notes — full width */}
          <div style={{ gridColumn: "span 2" }}>
            <label style={lbl}>নোট</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              style={{ ...inp, minHeight: 60, resize: "vertical" }} placeholder="অতিরিক্ত তথ্য..." />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <button type="button" onClick={() => navigate("/expenses")}
            style={{ padding: "10px 20px", borderRadius: 9, border: "1.5px solid var(--border)", background: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, color: "var(--muted)" }}>
            বাতিল
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "var(--primary)", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.95rem" }}>
            {loading ? "জমা হচ্ছে..." : isEdit ? "আপডেট করুন" : "খরচ জমা দিন"}
          </button>
        </div>
      </form>
    </div>
  );
}
