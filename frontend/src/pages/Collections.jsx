import { useState, useEffect, useCallback } from "react";
import { getCollections, createCollection, deleteCollection, getMembers, getSettingsBanks, getChartOfAccounts } from "../api.js";
import {
  Modal, Field, Input, Select, Btn,
  StatCard, Badge, Toast, PageHeader, StatsGrid,
  FormGrid, FormActions, useToast, today,
} from "../components.jsx";

const tk = n => `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = d => d ? new Date(d).toISOString().slice(0, 10).split("-").reverse().join("-") : "—";

const PAY_METHOD = {
  cash:           { label: "নগদ",              color: "#16a34a" },
  bank:           { label: "ব্যাংক",            color: "#2563eb" },
  mobile_banking: { label: "মোবাইল ব্যাংকিং", color: "#7c3aed" },
};

// ── New Entry Modal ───────────────────────────────────────────
function NewEntryModal({ members, banks, accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    memberId:      "",
    titleBn:       "",
    amount:        "",
    collectionDate: today(),
    accountId:     "",
    paymentMethod: "cash",
    bankAccountId: "",
    notes:         "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  // handles both raw event (from Input/Select) and direct value calls
  const set = k => e => {
    setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));
    setErrors(prev => ({ ...prev, [k]: "" }));
  };

  // Default to Special Collection Fund if available
  useEffect(() => {
    const special = accounts.find(a => a.accountCode === "2002");
    if (special && !form.accountId) set("accountId")(String(special.id));
  }, [accounts]);

  const submit = async () => {
    const errs = {};
    if (!form.memberId)              errs.memberId  = "সদস্য নির্বাচন করুন";
    if (!form.titleBn)               errs.titleBn   = "শিরোনাম লিখুন";
    if (!form.amount || +form.amount <= 0) errs.amount = "পরিমাণ (৳) * দিতে হবে";
    if (!form.accountId)             errs.accountId = "জমা তহবিল নির্বাচন করুন";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await onSave({
        memberId:       +form.memberId,
        title:          form.titleBn,
        titleBn:        form.titleBn,
        amount:         +form.amount,
        collectionDate: form.collectionDate,
        accountId:      +form.accountId,
        paymentMethod:  form.paymentMethod,
        bankAccountId:  form.bankAccountId ? +form.bankAccountId : null,
        notes:          form.notes || null,
      });
    } catch (e) {
      setErrors({ _global: e.message || "সংরক্ষণ ব্যর্থ হয়েছে" });
    } finally {
      setSaving(false);
    }
  };

  const fundAccounts = accounts.filter(a => a.type === "liability" || a.type === "income");

  const err = k => errors[k] ? <span style={{ color: "var(--danger)", fontSize: "0.72rem", marginTop: 2, display: "block" }}>{errors[k]}</span> : null;

  return (
    <Modal title="নতুন সংগ্রহ এন্ট্রি" onClose={onClose}>
      {errors._global && (
        <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "var(--danger)", fontSize: "0.82rem", marginBottom: 12 }}>
          {errors._global}
        </div>
      )}
      <FormGrid>
        <Field label="সদস্য নির্বাচন *">
          <Select value={form.memberId} onChange={set("memberId")} style={errors.memberId ? { borderColor: "var(--danger)" } : {}}>
            <option value="">— সদস্য বেছে নিন —</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          {err("memberId")}
        </Field>
        <Field label="তারিখ *">
          <Input type="date" value={form.collectionDate} onChange={set("collectionDate")} />
        </Field>
        <Field label="উদ্দেশ্য / শিরোনাম *">
          <Input value={form.titleBn} onChange={set("titleBn")} placeholder="ব্যাংক একাউন্ট ফি" style={errors.titleBn ? { borderColor: "var(--danger)" } : {}} />
          {err("titleBn")}
        </Field>
        <Field label="পরিমাণ (৳) *">
          <Input type="number" value={form.amount} onChange={set("amount")} placeholder="500" style={errors.amount ? { borderColor: "var(--danger)" } : {}} />
          {err("amount")}
        </Field>
        <Field label="জমা তহবিল *">
          <Select value={form.accountId} onChange={set("accountId")} style={errors.accountId ? { borderColor: "var(--danger)" } : {}}>
            <option value="">— একাউন্ট নির্বাচন করুন —</option>
            {fundAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.accountCode} — {a.category}</option>
            ))}
          </Select>
          {err("accountId")}
        </Field>
        <Field label="পরিশোধ পদ্ধতি">
          <Select value={form.paymentMethod} onChange={set("paymentMethod")}>
            <option value="cash">নগদ</option>
            <option value="bank">ব্যাংক</option>
            <option value="mobile_banking">মোবাইল ব্যাংকিং</option>
          </Select>
        </Field>
        {(form.paymentMethod === "bank" || form.paymentMethod === "mobile_banking") && (
          <Field label="ব্যাংক একাউন্ট">
            <Select value={form.bankAccountId} onChange={set("bankAccountId")}>
              <option value="">— নির্বাচন করুন —</option>
              {banks.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>
              ))}
            </Select>
          </Field>
        )}
      </FormGrid>
      <Field label="নোট">
        <Input value={form.notes} onChange={set("notes")} placeholder="ঐচ্ছিক বিবরণ" />
      </Field>
      <FormActions onCancel={onClose} onSubmit={submit} saving={saving} />
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Collections() {
  const [toast, showToast] = useToast();

  const [entries,  setEntries]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [members,  setMembers]  = useState([]);
  const [banks,    setBanks]    = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);

  // Filters
  const [memberId,  setMemberId]  = useState("");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (memberId)  params.member_id  = memberId;
      if (fromDate)  params.from_date  = fromDate;
      if (toDate)    params.to_date    = toDate;
      const r = await getCollections(params);
      setEntries(Array.isArray(r.entries) ? r.entries : []);
      setTotal(r.total || 0);
    } catch {
      showToast("লোড হয়নি", "error");
    } finally {
      setLoading(false);
    }
  }, [memberId, fromDate, toDate]);

  useEffect(() => {
    load();
    getMembers().then(r => {
      // API returns array directly
      const arr = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
      setMembers(arr);
    }).catch(() => {});
    getSettingsBanks().then(r => setBanks(Array.isArray(r) ? r : [])).catch(() => {});
    getChartOfAccounts().then(r => setAccounts(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const handleSave = async (body) => {
    try {
      await createCollection(body);
      showToast("সংগ্রহ সফলভাবে রেকর্ড হয়েছে");
      setShowNew(false);
      load();
    } catch (e) {
      showToast(e.message || "সংরক্ষণ ব্যর্থ হয়েছে", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("এই এন্ট্রি মুছে ফেলবেন? সংশ্লিষ্ট লেনদেনও বাতিল হবে।")) return;
    try {
      await deleteCollection(id);
      showToast("মুছে ফেলা হয়েছে");
      load();
    } catch (e) {
      showToast(e.message || "মুছতে ব্যর্থ হয়েছে", "error");
    }
  };

  const uniqueMembers = [...new Set(entries.map(e => e.memberName))].length;

  return (
    <div style={{ animation: "slideUp .25s ease" }}>
      <Toast toast={toast} />

      {showNew && (
        <NewEntryModal
          members={members}
          banks={banks}
          accounts={accounts}
          onSave={handleSave}
          onClose={() => setShowNew(false)}
        />
      )}

      <PageHeader title="বিশেষ সংগ্রহ">
        <Btn variant="primary" onClick={() => setShowNew(true)}>+ নতুন সংগ্রহ</Btn>
      </PageHeader>

      {/* Stats */}
      <StatsGrid>
        <StatCard label="মোট এন্ট্রি"     value={entries.length} icon="accounts"  color="var(--primary)" />
        <StatCard label="মোট সংগ্রহ"      value={tk(total)}      icon="money_in"  color="#2563eb"        />
        <StatCard label="সদস্য সংখ্যা"    value={uniqueMembers}  icon="members"   color="var(--gold)"    />
      </StatsGrid>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.2rem", marginBottom: "1.2rem", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 200 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>সদস্য</label>
          <select value={memberId} onChange={e => setMemberId(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "inherit", background: "#fff" }}>
            <option value="">সকল সদস্য</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>শুরু তারিখ</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>শেষ তারিখ</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "inherit" }} />
        </div>
        <button onClick={load} style={{ padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", alignSelf: "flex-end" }}>
          দেখুন
        </button>
        {(memberId || fromDate || toDate) && (
          <button onClick={() => { setMemberId(""); setFromDate(""); setToDate(""); }} style={{ padding: "9px 14px", background: "#fff", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", alignSelf: "flex-end" }}>
            রিসেট
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>লোড হচ্ছে…</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
            কোনো সংগ্রহ পাওয়া যায়নি।<br />
            <button onClick={() => setShowNew(true)} style={{ marginTop: "1rem", padding: "8px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>+ নতুন সংগ্রহ যোগ করুন</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1a6b5a" }}>
                {["ক্র.", "তারিখ", "সদস্যের নাম", "উদ্দেশ্য", "তহবিল", "পদ্ধতি", "পরিমাণ", ""].map((h, i) => (
                  <th key={i} style={{ padding: "11px 12px", color: "#fff", fontSize: "0.78rem", fontWeight: 700, textAlign: i === 6 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const pm = PAY_METHOD[e.paymentMethod] || PAY_METHOD.cash;
                return (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf9", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", color: "var(--muted)" }}>{i + 1}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{fmtDate(e.collectionDate)}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.85rem", fontWeight: 700 }}>{e.memberName}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                      {e.titleBn || e.title}
                      {e.titleBn && e.title && <span style={{ color: "var(--muted)", fontSize: "0.72rem", marginLeft: 6 }}>({e.title})</span>}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "var(--muted)" }}>{e.accountName || "—"}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: pm.color + "18", color: pm.color }}>{pm.label}</span>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", textAlign: "right" }}>{tk(e.amount)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      <button onClick={() => handleDelete(e.id)} style={{ padding: "4px 12px", background: "none", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", fontFamily: "inherit" }}>মুছুন</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0d3528" }}>
                <td colSpan={6} style={{ padding: "10px 12px", color: "#fff", fontWeight: 800, fontSize: "0.85rem" }}>সর্বমোট ({entries.length} টি)</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6ee7b7", fontWeight: 800, fontSize: "0.9rem" }}>{tk(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
