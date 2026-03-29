// ================================================================
// Users Management Page (Admin only)
// ================================================================
import { useState, useEffect, useCallback } from "react";
import { getToken } from "../auth.js";
import { Modal, Field, Input, Select, Btn, StatCard, Table, Badge,
         Toast, PageHeader, StatsGrid, useToast } from "../components.jsx";
import { ROLES } from "../auth.js";

const BASE = "/api/auth";

const authFetch = async (url, opts = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

export default function Users({ currentUser }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await authFetch(`${BASE}/users`));
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name:   form.name,
        mobile: form.mobile,
        role:   form.role,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };
      await authFetch(`${BASE}/users/${form.id}`, {
        method: "PUT", body: JSON.stringify(payload),
      });
      showToast("আপডেট হয়েছে ✓");
      setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (id === currentUser?.id) return showToast("নিজেকে মুছতে পারবেন না", "error");
    if (!window.confirm("এই ব্যবহারকারীকে মুছে ফেলবেন?")) return;
    try {
      await authFetch(`${BASE}/users/${id}`, { method: "DELETE" });
      showToast("মুছে ফেলা হয়েছে"); load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const roleColor = r => ROLES[r]?.color || "var(--muted)";
  const roleLabel = r => ROLES[r]?.label || r;

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="ব্যবহারকারী ব্যবস্থাপনা" />

      <StatsGrid>
        <StatCard label="মোট ব্যবহারকারী" value={data.length}                                        icon="members" color="var(--primary)" />
        <StatCard label="অ্যাডমিন"         value={data.filter(u=>u.role==="admin").length}            icon="members" color="var(--danger)"  />
        <StatCard label="হিসাবরক্ষক"       value={data.filter(u=>u.role==="accountant").length}       icon="accounts" color="#8b5cf6"       />
        <StatCard label="সক্রিয়"           value={data.filter(u=>u.status==="active").length}         icon="members" color="var(--success)" />
      </StatsGrid>

      <Table
        loading={loading}
        cols={[
          { key: "name",   label: "নাম" },
          { key: "email",  label: "ইমেইল" },
          { key: "mobile", label: "মোবাইল" },
          { key: "role",   label: "ভূমিকা",  render: r => <Badge color={roleColor(r.role)}>{roleLabel(r.role)}</Badge> },
          { key: "status", label: "অবস্থা",   render: r => <Badge color={r.status==="active"?"var(--success)":"var(--danger)"}>{r.status==="active"?"সক্রিয়":"নিষ্ক্রিয়"}</Badge> },
        ]}
        rows={data}
        onEdit={r => { setForm({ ...r, password: "" }); setModal(true); }}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title="ব্যবহারকারী সম্পাদনা" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
              <Field label="নাম" half><Input value={form.name || ""} onChange={set("name")} /></Field>
              <Field label="মোবাইল" half><Input value={form.mobile || ""} onChange={set("mobile")} /></Field>
              <Field label="ভূমিকা (Role)" half>
                <Select value={form.role || "member"} onChange={set("role")}>
                  <option value="admin">অ্যাডমিন</option>
                  <option value="accountant">হিসাবরক্ষক</option>
                  <option value="member">সদস্য</option>
                  <option value="viewer">দর্শক</option>
                </Select>
              </Field>
              <Field label="অবস্থা" half>
                <Select value={form.status || "active"} onChange={set("status")}>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                  <option value="suspended">স্থগিত</option>
                </Select>
              </Field>
              <Field label="নতুন পাসওয়ার্ড (ঐচ্ছিক)">
                <Input type="password" value={form.password || ""} onChange={set("password")} placeholder="খালি রাখলে পরিবর্তন হবে না" />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="muted" onClick={() => setModal(false)} type="button">বাতিল</Btn>
              <Btn icon="save" loading={saving} type="submit">সংরক্ষণ</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
