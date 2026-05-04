import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getChartOfAccounts, createChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
  getSettingsBanks, createSettingsBank, updateSettingsBank, deleteSettingsBank,
  getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
} from "../api.js";
import {
  Modal, Field, Input, Select, Btn, Table, Badge,
  Toast, PageHeader, useToast, Loader,
} from "../components.jsx";

const TYPE_LABEL = { asset: "সম্পদ", liability: "দায়", equity: "মূলধন", income: "আয়", expense: "ব্যয়" };
const TYPE_COLOR = { asset: "var(--primary)", liability: "var(--gold)", equity: "#8b5cf6", income: "var(--success)", expense: "var(--danger)" };

// ── Chart of Accounts ────────────────────────────────────────
function ChartOfAccounts() {
  const [data,   setData]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [toast,  showToast] = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getChartOfAccounts()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const openAdd  = () => { setForm({ type: "asset" }); setModal(true); };
  const openEdit = r  => { setForm({ ...r, type: r.type }); setModal(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.type) return showToast("ধরন আবশ্যক", "error");
    const payload = { accountCode: form.accountCode || null, type: form.type, category: form.category || null, description: form.description || null };
    try {
      setSaving(true);
      form.id ? await updateChartOfAccount(form.id, payload) : await createChartOfAccount(payload);
      showToast("সংরক্ষিত হয়েছে"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("এই অ্যাকাউন্টটি মুছে ফেলবেন?")) return;
    try { await deleteChartOfAccount(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="চার্ট অব অ্যাকাউন্টস">
        <Btn icon="add" onClick={openAdd}>নতুন অ্যাকাউন্ট</Btn>
      </PageHeader>

      <Table
        loading={loading}
        cols={[
          { key: "accountCode", label: "কোড" },
          { key: "type",        label: "ধরন",   render: r => <Badge color={TYPE_COLOR[r.type] || "var(--primary)"}>{TYPE_LABEL[r.type] || r.type}</Badge> },
          { key: "category",    label: "বিভাগ" },
          { key: "description", label: "বিবরণ" },
        ]}
        rows={data}
        onEdit={handleDelete && openEdit}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title={form.id ? "অ্যাকাউন্ট সম্পাদনা" : "নতুন অ্যাকাউন্ট"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="অ্যাকাউন্ট কোড">
              <Input value={form.accountCode || ""} onChange={set("accountCode")} placeholder="যেমন: 1001" />
            </Field>
            <Field label="ধরন" required>
              <Select value={form.type || "asset"} onChange={set("type")}>
                <option value="asset">সম্পদ (Asset)</option>
                <option value="liability">দায় (Liability)</option>
                <option value="equity">মূলধন (Equity)</option>
                <option value="income">আয় (Income)</option>
                <option value="expense">ব্যয় (Expense)</option>
              </Select>
            </Field>
            <Field label="বিভাগ / নাম" required>
              <Input value={form.category || ""} onChange={set("category")} placeholder="যেমন: Bank, Member Fund" />
            </Field>
            <Field label="বিবরণ">
              <Input value={form.description || ""} onChange={set("description")} placeholder="সংক্ষিপ্ত বিবরণ" />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1rem" }}>
              <Btn variant="muted" type="button" onClick={() => setModal(false)}>বাতিল</Btn>
              <Btn loading={saving} type="submit">সংরক্ষণ</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Bank Accounts ────────────────────────────────────────────
function BankAccounts() {
  const [data,   setData]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [toast,  showToast] = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getSettingsBanks()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set    = f => e  => setForm(p => ({ ...p, [f]: e.target.value }));
  const toggle = f => () => setForm(p => ({ ...p, [f]: !p[f] }));

  const openAdd  = () => { setForm({ isActive: true }); setModal(true); };
  const openEdit = r  => { setForm({ ...r }); setModal(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.bankName) return showToast("ব্যাংকের নাম আবশ্যক", "error");
    const payload = {
      bankName:      form.bankName      || null,
      accountName:   form.accountName   || null,
      accountNumber: form.accountNumber || null,
      branchName:    form.branchName    || null,
      routingNumber: form.routingNumber || null,
      isActive:      form.isActive !== false,
    };
    try {
      setSaving(true);
      form.id ? await updateSettingsBank(form.id, payload) : await createSettingsBank(payload);
      showToast("সংরক্ষিত হয়েছে"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("এই ব্যাংক অ্যাকাউন্টটি মুছে ফেলবেন?")) return;
    try { await deleteSettingsBank(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="ব্যাংক অ্যাকাউন্ট">
        <Btn icon="add" onClick={openAdd}>নতুন ব্যাংক</Btn>
      </PageHeader>

      <Table
        loading={loading}
        cols={[
          { key: "bankName",      label: "ব্যাংকের নাম" },
          { key: "accountName",   label: "অ্যাকাউন্টের নাম" },
          { key: "accountNumber", label: "অ্যাকাউন্ট নম্বর" },
          { key: "branchName",    label: "শাখা" },
          { key: "routingNumber", label: "রাউটিং নম্বর" },
          { key: "isActive",      label: "অবস্থা", render: r => <Badge color={r.isActive ? "var(--success)" : "var(--muted)"}>{r.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge> },
        ]}
        rows={data}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title={form.id ? "ব্যাংক সম্পাদনা" : "নতুন ব্যাংক অ্যাকাউন্ট"} onClose={() => setModal(false)} wide>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
              <Field label="ব্যাংকের নাম" required half>
                <Input value={form.bankName || ""} onChange={set("bankName")} placeholder="যেমন: Sonali Bank" />
              </Field>
              <Field label="অ্যাকাউন্টের নাম" half>
                <Input value={form.accountName || ""} onChange={set("accountName")} placeholder="অ্যাকাউন্ট হোল্ডার নাম" />
              </Field>
              <Field label="অ্যাকাউন্ট নম্বর" half>
                <Input value={form.accountNumber || ""} onChange={set("accountNumber")} placeholder="অ্যাকাউন্ট নম্বর" />
              </Field>
              <Field label="শাখার নাম" half>
                <Input value={form.branchName || ""} onChange={set("branchName")} placeholder="শাখার নাম" />
              </Field>
              <Field label="রাউটিং নম্বর" half>
                <Input value={form.routingNumber || ""} onChange={set("routingNumber")} placeholder="রাউটিং নম্বর" />
              </Field>
              <Field label="অবস্থা" half>
                <Select value={form.isActive !== false ? "1" : "0"} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === "1" }))}>
                  <option value="1">সক্রিয়</option>
                  <option value="0">নিষ্ক্রিয়</option>
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1rem" }}>
              <Btn variant="muted" type="button" onClick={() => setModal(false)}>বাতিল</Btn>
              <Btn loading={saving} type="submit">সংরক্ষণ</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Expense Categories ───────────────────────────────────────
function ExpenseCategorySettings() {
  const [cats,    setCats]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | "add" | { edit: cat }
  const [form,    setForm]    = useState({ name: "", nameBn: "" });
  const [saving,  setSaving]  = useState(false);
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setCats(await getExpenseCategories()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = ()  => { setForm({ name: "", nameBn: "" }); setModal("add"); };
  const openEdit = cat => { setForm({ name: cat.name, nameBn: cat.nameBn || "" }); setModal({ edit: cat }); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name) return showToast("নাম আবশ্যক", "error");
    try {
      setSaving(true);
      if (modal?.edit) {
        await updateExpenseCategory(modal.edit.id, form);
        showToast("আপডেট হয়েছে");
      } else {
        await createExpenseCategory(form);
        showToast("ক্যাটাগরি যোগ হয়েছে");
      }
      setModal(null);
      load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleToggle = async cat => {
    try {
      if (cat.isActive) {
        await deleteExpenseCategory(cat.id);
        showToast("নিষ্ক্রিয় করা হয়েছে");
      } else {
        await updateExpenseCategory(cat.id, { name: cat.name, nameBn: cat.nameBn, isActive: 1 });
        showToast("সক্রিয় করা হয়েছে");
      }
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="খরচের ক্যাটাগরি">
        <Btn icon="add" onClick={openAdd}>নতুন ক্যাটাগরি</Btn>
      </PageHeader>

      <Table
        loading={loading}
        cols={[
          { key: "name",     label: "নাম (English)" },
          { key: "nameBn",   label: "নাম (বাংলা)", render: r => r.nameBn || "—" },
          { key: "isActive", label: "অবস্থা", render: r => (
            <Badge color={r.isActive ? "var(--success)" : "var(--muted)"}>
              {r.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
            </Badge>
          )},
        ]}
        rows={cats}
        onEdit={openEdit}
        onDelete={cat => handleToggle(cat)}
      />

      {modal && (
        <Modal
          title={modal?.edit ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit}>
            <Field label="নাম (English)" required>
              <Input value={form.name} onChange={set("name")} placeholder="e.g. Office Expense" />
            </Field>
            <Field label="নাম (বাংলা)">
              <Input value={form.nameBn} onChange={set("nameBn")} placeholder="যেমন: অফিস খরচ" />
            </Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "1rem" }}>
              <Btn variant="muted" type="button" onClick={() => setModal(null)}>বাতিল</Btn>
              <Btn loading={saving} type="submit">সংরক্ষণ</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Settings Layout ──────────────────────────────────────────
export default function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const tabs = [
    { path: "/settings/chart-of-accounts",  label: "চার্ট অব অ্যাকাউন্টস" },
    { path: "/settings/bank-accounts",      label: "ব্যাংক অ্যাকাউন্ট"     },
    { path: "/settings/expense-categories", label: "খরচের ক্যাটাগরি"         },
  ];

  useEffect(() => {
    if (path === "/settings" || path === "/settings/") {
      navigate("/settings/chart-of-accounts", { replace: true });
    }
  }, [path]);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => {
          const active = path === t.path;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              style={{
                padding: "8px 20px", border: "none", borderRadius: "8px 8px 0 0",
                cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
                background: active ? "var(--primary)" : "var(--card)",
                color: active ? "#fff" : "var(--muted)",
                borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {path === "/settings/chart-of-accounts"  && <ChartOfAccounts />}
      {path === "/settings/bank-accounts"      && <BankAccounts />}
      {path === "/settings/expense-categories" && <ExpenseCategorySettings />}
    </div>
  );
}
