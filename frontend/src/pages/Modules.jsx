// ================================================================
// Donations Page
// ================================================================
import { useState, useEffect, useCallback } from "react";
import {
  getDonations, createDonation, updateDonation, deleteDonation,
  getProjects,
  getBeneficiaries, createBeneficiary, updateBeneficiary, deleteBeneficiary,
  getMeetings, createMeeting, updateMeeting, deleteMeeting,
  createProject, updateProject, deleteProject,
} from "../api.js";
import {
  Modal, Field, Input, Select, Textarea, Btn,
  StatCard, Table, Badge, Toast, PageHeader,
  SearchBox, StatsGrid, FormGrid, FormActions,
  useToast, fmtDate, fmtMoney, today, Loader,
} from "../components.jsx";

// ── DONATIONS ─────────────────────────────────────────────
const TYPE_L = { general: "সাধারণ দান", zakat: "যাকাত", sadaqah: "সদকা", project: "প্রকল্প" };
const TYPE_C = { general: "var(--primary)", zakat: "var(--gold)", sadaqah: "var(--success)", project: "#8b5cf6" };

export function Donations() {
  const [data,     setData]     = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [toast,    showToast]   = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, p] = await Promise.all([getDonations(search), getProjects()]);
      setData(d); setProjects(p);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));
  const total      = data.reduce((s, d) => s + Number(d.amount), 0);
  const zakatTotal = data.filter(d => d.donType === "zakat").reduce((s, d) => s + Number(d.amount), 0);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.donor || !form.amount) return showToast("দাতার নাম ও পরিমাণ আবশ্যক", "error");
    const payload = { ...form, type: form.donType || form.type || "general" };
    try {
      setSaving(true);
      form.id ? await updateDonation(form.id, payload) : await createDonation(payload);
      showToast("সংরক্ষিত হয়েছে ✓"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("মুছে ফেলবেন?")) return;
    try { await deleteDonation(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const openEdit = r => setForm({ ...r, type: r.donType, donType: r.donType });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="দান ও অনুদান">
        <SearchBox value={search} onChange={setSearch} placeholder="দাতা খুঁজুন..." />
        <Btn icon="add" onClick={() => { setForm({ date: today(), type: "general", donType: "general", amount: "" }); setModal(true); }}>নতুন দান</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট দান"   value={fmtMoney(total)}      icon="donations" color="#8b5cf6" />
        <StatCard label="যাকাত"     value={fmtMoney(zakatTotal)} icon="donations" color="var(--gold)" />
        <StatCard label="মোট দাতা"  value={data.length}          icon="members"   color="var(--primary)" />
        <StatCard label="এই মাসে"   value={fmtMoney(data.filter(d => d.date?.startsWith(today().slice(0,7))).reduce((s,d)=>s+Number(d.amount),0))} icon="trend_up" color="var(--success)" />
      </StatsGrid>

      <Table
        loading={loading}
        cols={[
          { key: "date",    label: "তারিখ",  render: r => fmtDate(r.date) },
          { key: "donor",   label: "দাতার নাম" },
          { key: "phone",   label: "ফোন" },
          { key: "donType", label: "ধরন",    render: r => <Badge color={TYPE_C[r.donType] || "var(--primary)"}>{TYPE_L[r.donType] || r.donType}</Badge> },
          { key: "amount",  label: "পরিমাণ", render: r => <span style={{ fontWeight: 700, color: "var(--success)" }}>{fmtMoney(r.amount)}</span> },
          { key: "notes",   label: "মন্তব্য" },
        ]}
        rows={data} onEdit={r => { openEdit(r); setModal(true); }} onDelete={handleDelete}
      />

      {modal && (
        <Modal title={form.id ? "দান সম্পাদনা" : "নতুন দান নথিভুক্ত"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <Field label="দাতার নাম" required half><Input value={form.donor || ""} onChange={set("donor")} /></Field>
              <Field label="ফোন নম্বর" half><Input value={form.phone || ""} onChange={set("phone")} /></Field>
              <Field label="দানের ধরন" half>
                <Select value={form.donType || form.type || "general"} onChange={e => setForm(p => ({ ...p, donType: e.target.value, type: e.target.value }))}>
                  <option value="general">সাধারণ দান</option>
                  <option value="zakat">যাকাত</option>
                  <option value="sadaqah">সদকা</option>
                  <option value="project">প্রকল্প</option>
                </Select>
              </Field>
              <Field label="তারিখ" half><Input type="date" value={form.date || today()} onChange={set("date")} /></Field>
              <Field label="পরিমাণ (৳)" required half><Input type="number" value={form.amount || ""} onChange={set("amount")} /></Field>
              {(form.donType === "project" || form.type === "project") && (
                <Field label="প্রকল্প" half>
                  <Select value={form.projectId || ""} onChange={set("projectId")}>
                    <option value="">বেছে নিন</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="ঠিকানা"><Input value={form.address || ""} onChange={set("address")} /></Field>
              <Field label="মন্তব্য"><Textarea value={form.notes || ""} onChange={set("notes")} /></Field>
            </FormGrid>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── PROJECTS ──────────────────────────────────────────────
const STS_C = { active: "var(--success)", completed: "var(--primary)", paused: "var(--gold)", cancelled: "var(--danger)" };
const STS_L = { active: "সক্রিয়", completed: "সম্পন্ন", paused: "বিরতি", cancelled: "বাতিল" };

export function Projects() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getProjects()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name) return showToast("প্রকল্পের নাম আবশ্যক", "error");
    try {
      setSaving(true);
      form.id ? await updateProject(form.id, form) : await createProject(form);
      showToast("সংরক্ষিত হয়েছে ✓"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("প্রকল্প মুছে ফেলবেন?")) return;
    try { await deleteProject(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="প্রকল্প ব্যবস্থাপনা">
        <Btn icon="add" onClick={() => { setForm({ status: "active", startDate: today(), budget: "", spent: "0" }); setModal(true); }}>নতুন প্রকল্প</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট প্রকল্প" value={data.length}                                                              icon="projects"  color="var(--primary)" />
        <StatCard label="সক্রিয়"      value={data.filter(p => p.status === "active").length}                          icon="projects"  color="var(--success)" />
        <StatCard label="মোট বাজেট"   value={fmtMoney(data.reduce((s, p) => s + Number(p.budget || 0), 0))}           icon="accounts"  color="var(--gold)"    />
        <StatCard label="মোট ব্যয়"    value={fmtMoney(data.reduce((s, p) => s + Number(p.spent  || 0), 0))}           icon="money_out" color="var(--danger)"  />
      </StatsGrid>

      <div style={{ display: "grid", gap: 12 }}>
        {data.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>কোনো প্রকল্প নেই</p>}
        {data.map(p => {
          const pct = p.budget > 0 ? Math.min(100, Math.round(Number(p.spent || 0) / Number(p.budget) * 100)) : 0;
          const barColor = pct > 90 ? "var(--danger)" : pct > 70 ? "var(--gold)" : "var(--success)";
          return (
            <div key={p.id} style={{ background: "var(--card)", borderRadius: 12, padding: "1.25rem", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>{p.name}</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>{p.description || ""}</p>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge color={STS_C[p.status]}>{STS_L[p.status]}</Badge>
                  <button onClick={() => { setForm({ ...p, startDate: p.startDate || today() }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 4 }}>✏️</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>🗑️</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { l: "বাজেট",   v: fmtMoney(p.budget), c: "var(--text)" },
                  { l: "ব্যয়",    v: fmtMoney(p.spent),  c: "var(--danger)" },
                  { l: "অবশিষ্ট", v: fmtMoney(Number(p.budget||0)-Number(p.spent||0)), c: "var(--success)" },
                  { l: "সময়কাল", v: `${fmtDate(p.startDate)} — ${fmtDate(p.endDate)}`, c: "var(--muted)" },
                ].map(i => (
                  <span key={i.l} style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {i.l}: <strong style={{ color: i.c }}>{i.v}</strong>
                  </span>
                ))}
              </div>
              <div style={{ background: "var(--border)", borderRadius: 20, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 20, transition: "width .5s" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4, textAlign: "right" }}>{pct}% ব্যয়িত</div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={form.id ? "প্রকল্প সম্পাদনা" : "নতুন প্রকল্প"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="প্রকল্পের নাম" required><Input value={form.name || ""} onChange={set("name")} /></Field>
            <Field label="বিবরণ"><Textarea value={form.description || ""} onChange={set("description")} /></Field>
            <FormGrid>
              <Field label="বাজেট (৳)" half><Input type="number" value={form.budget || ""} onChange={set("budget")} /></Field>
              <Field label="ব্যয় (৳)"  half><Input type="number" value={form.spent  || ""} onChange={set("spent")}  /></Field>
              <Field label="শুরুর তারিখ" half><Input type="date" value={form.startDate || today()} onChange={set("startDate")} /></Field>
              <Field label="শেষের তারিখ" half><Input type="date" value={form.endDate || ""}        onChange={set("endDate")}   /></Field>
              <Field label="অবস্থা" half>
                <Select value={form.status || "active"} onChange={set("status")}>
                  <option value="active">সক্রিয়</option>
                  <option value="completed">সম্পন্ন</option>
                  <option value="paused">বিরতি</option>
                  <option value="cancelled">বাতিল</option>
                </Select>
              </Field>
            </FormGrid>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── BENEFICIARIES ────────────────────────────────────────
const CAT_C = { food: "var(--success)", education: "var(--primary)", medical: "var(--danger)", shelter: "var(--gold)", other: "var(--muted)" };
const CAT_L = { food: "খাদ্য", education: "শিক্ষা", medical: "চিকিৎসা", shelter: "আশ্রয়", other: "অন্যান্য" };

export function Beneficiaries() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getBeneficiaries(search)); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name) return showToast("নাম আবশ্যক", "error");
    try {
      setSaving(true);
      form.id ? await updateBeneficiary(form.id, form) : await createBeneficiary(form);
      showToast("সংরক্ষিত হয়েছে ✓"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("মুছে ফেলবেন?")) return;
    try { await deleteBeneficiary(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="উপকারভোগী ব্যবস্থাপনা">
        <SearchBox value={search} onChange={setSearch} />
        <Btn icon="add" onClick={() => { setForm({ status: "active", category: "food", joinDate: today(), monthlyAid: "" }); setModal(true); }}>নতুন যোগ</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট"            value={data.length}                                                                        icon="beneficiary" color="var(--success)"  />
        <StatCard label="মাসিক সহায়তা"  value={fmtMoney(data.filter(b => b.status === "active").reduce((s, b) => s + Number(b.monthlyAid || 0), 0))} icon="accounts" color="var(--gold)" />
        <StatCard label="খাদ্য সহায়তা"  value={data.filter(b => b.category === "food").length}                                     icon="beneficiary" color="var(--primary)" />
        <StatCard label="শিক্ষা সহায়তা" value={data.filter(b => b.category === "education").length}                                icon="beneficiary" color="#8b5cf6"        />
      </StatsGrid>

      <Table
        loading={loading}
        cols={[
          { key: "name",       label: "নাম" },
          { key: "phone",      label: "ফোন" },
          { key: "address",    label: "ঠিকানা" },
          { key: "category",   label: "ধরন",           render: r => <Badge color={CAT_C[r.category] || "var(--primary)"}>{CAT_L[r.category] || r.category}</Badge> },
          { key: "monthlyAid", label: "মাসিক সহায়তা", render: r => fmtMoney(r.monthlyAid) },
          { key: "status",     label: "অবস্থা",        render: r => <Badge color={r.status === "active" ? "var(--success)" : "var(--danger)"}>{r.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge> },
        ]}
        rows={data}
        onEdit={r => { setForm({ ...r }); setModal(true); }}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title={form.id ? "তথ্য সম্পাদনা" : "নতুন উপকারভোগী"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <Field label="নাম" required half><Input value={form.name || ""} onChange={set("name")} /></Field>
              <Field label="ফোন" half><Input value={form.phone || ""} onChange={set("phone")} /></Field>
              <Field label="সহায়তার ধরন" half>
                <Select value={form.category || "food"} onChange={set("category")}>
                  <option value="food">খাদ্য</option>
                  <option value="education">শিক্ষা</option>
                  <option value="medical">চিকিৎসা</option>
                  <option value="shelter">আশ্রয়</option>
                  <option value="other">অন্যান্য</option>
                </Select>
              </Field>
              <Field label="মাসিক সহায়তা (৳)" half><Input type="number" value={form.monthlyAid || ""} onChange={set("monthlyAid")} /></Field>
              <Field label="যোগদানের তারিখ" half><Input type="date" value={form.joinDate || today()} onChange={set("joinDate")} /></Field>
              <Field label="অবস্থা" half>
                <Select value={form.status || "active"} onChange={set("status")}>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                </Select>
              </Field>
              <Field label="ঠিকানা"><Input value={form.address || ""} onChange={set("address")} /></Field>
              <Field label="নোট"><Textarea value={form.notes || ""} onChange={set("notes")} /></Field>
            </FormGrid>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── MEETINGS ──────────────────────────────────────────────
const M_STS_C = { upcoming: "var(--gold)", completed: "var(--success)", cancelled: "var(--danger)" };
const M_STS_L = { upcoming: "আসন্ন", completed: "সম্পন্ন", cancelled: "বাতিল" };
const M_TYP_L = { general: "সাধারণ সভা", committee: "কমিটি", emergency: "জরুরি", agm: "বার্ষিক সাধারণ সভা" };

export function Meetings() {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [toast,    showToast]   = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getMeetings()); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title || !form.date) return showToast("শিরোনাম ও তারিখ আবশ্যক", "error");
    const payload = { ...form, type: form.mtType || form.type || "general" };
    try {
      setSaving(true);
      form.id ? await updateMeeting(form.id, payload) : await createMeeting(payload);
      showToast("সংরক্ষিত হয়েছে ✓"); setModal(false); load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("মুছে ফেলবেন?")) return;
    try { await deleteMeeting(id); showToast("মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="মিটিং ও কমিটি">
        <Btn icon="add" onClick={() => { setForm({ date: today(), time: "10:00", mtType: "general", type: "general", status: "upcoming" }); setModal(true); }}>নতুন মিটিং</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট মিটিং" value={data.length}                                     icon="meetings" color="var(--primary)" />
        <StatCard label="আসন্ন"     value={data.filter(m => m.status === "upcoming").length} icon="meetings" color="var(--gold)"    />
        <StatCard label="সম্পন্ন"   value={data.filter(m => m.status === "completed").length}icon="meetings" color="var(--success)" />
        <StatCard label="বাতিল"     value={data.filter(m => m.status === "cancelled").length}icon="meetings" color="var(--danger)"  />
      </StatsGrid>

      {loading ? <Loader /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {data.length === 0 && <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>কোনো মিটিং নেই</p>}
          {data.map(m => (
            <div key={m.id} style={{ background: "var(--card)", borderRadius: 12, padding: "1.1rem 1.25rem", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{m.title}</h3>
                  <Badge color={M_STS_C[m.status]}>{M_STS_L[m.status]}</Badge>
                  <Badge color="var(--primary)">{M_TYP_L[m.mtType] || m.mtType}</Badge>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {m.date     && <span>📅 {fmtDate(m.date)}{m.time && ` ⏰ ${m.time}`}</span>}
                  {m.venue    && <span>📍 {m.venue}</span>}
                  {m.attendees && <span>👥 {m.attendees}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setViewItem(m)} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600 }}>বিস্তারিত</button>
                <button onClick={() => { setForm({ ...m, mtType: m.mtType }); setModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: 4 }}>✏️</button>
                <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal */}
      {modal && (
        <Modal title={form.id ? "মিটিং সম্পাদনা" : "নতুন মিটিং"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="শিরোনাম" required><Input value={form.title || ""} onChange={set("title")} /></Field>
            <FormGrid>
              <Field label="তারিখ" half><Input type="date" value={form.date || today()} onChange={set("date")} /></Field>
              <Field label="সময়"   half><Input type="time" value={form.time || "10:00"} onChange={set("time")} /></Field>
              <Field label="ধরন" half>
                <Select value={form.mtType || "general"} onChange={e => setForm(p => ({ ...p, mtType: e.target.value, type: e.target.value }))}>
                  <option value="general">সাধারণ সভা</option>
                  <option value="committee">কমিটি</option>
                  <option value="emergency">জরুরি</option>
                  <option value="agm">বার্ষিক সাধারণ সভা</option>
                </Select>
              </Field>
              <Field label="অবস্থা" half>
                <Select value={form.status || "upcoming"} onChange={set("status")}>
                  <option value="upcoming">আসন্ন</option>
                  <option value="completed">সম্পন্ন</option>
                  <option value="cancelled">বাতিল</option>
                </Select>
              </Field>
            </FormGrid>
            <Field label="স্থান"><Input value={form.venue || ""} onChange={set("venue")} placeholder="ভেন্যু / অনলাইন লিংক" /></Field>
            <Field label="উপস্থিত সদস্য"><Input value={form.attendees || ""} onChange={set("attendees")} placeholder="যেমন: ১৫ জন" /></Field>
            <Field label="আলোচ্য সূচি (এজেন্ডা)"><Textarea value={form.agenda || ""} onChange={set("agenda")} /></Field>
            <Field label="মিটিং মিনিটস / রেজুলেশন"><Textarea value={form.minutes || ""} onChange={set("minutes")} /></Field>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}

      {/* Detail View Modal */}
      {viewItem && (
        <Modal title={viewItem.title} onClose={() => setViewItem(null)}>
          {[
            { l: "তারিখ ও সময়",          v: `${fmtDate(viewItem.date)} ${viewItem.time || ""}` },
            { l: "স্থান",                  v: viewItem.venue     || "—" },
            { l: "ধরন",                    v: M_TYP_L[viewItem.mtType] || viewItem.mtType },
            { l: "অবস্থা",                 v: M_STS_L[viewItem.status] },
            { l: "উপস্থিত সদস্য",         v: viewItem.attendees || "—" },
            { l: "আলোচ্য সূচি",           v: viewItem.agenda    || "—" },
            { l: "মিনিটস / রেজুলেশন",     v: viewItem.minutes   || "—" },
          ].map(i => (
            <div key={i.l} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{i.l}</div>
              <div style={{ fontSize: "0.9rem", color: "var(--text)", whiteSpace: "pre-wrap" }}>{i.v}</div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
