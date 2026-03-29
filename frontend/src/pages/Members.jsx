import { useState, useEffect, useCallback } from "react";
import { getMembers, createMember, updateMember, deleteMember } from "../api.js";
import {
  Modal, Field, Input, Select, Textarea, Btn,
  StatCard, Table, Badge, Toast, PageHeader,
  SearchBox, StatsGrid, FormGrid, FormActions,
  useToast, fmtDate, fmtMoney, today,
} from "../components.jsx";

const CAT_LABEL  = { general: "সাধারণ", lifetime: "আজীবন", advisor: "উপদেষ্টা" };
const STS_COLOR  = { active: "var(--success)", inactive: "var(--danger)", pending: "var(--gold)" };
const STS_LABEL  = { active: "সক্রিয়", inactive: "নিষ্ক্রিয়", pending: "অপেক্ষমাণ" };

const EMPTY = { name: "", phone: "", email: "", address: "", category: "general", status: "active", joinDate: today(), fee: "", notes: "" };

export default function Members() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getMembers(search)); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const set = f => v => setForm(p => ({ ...p, [f]: typeof v === "string" ? v : v.target.value }));

  const openAdd  = () => { setForm(EMPTY); setModal(true); };
  const openEdit = r  => { setForm({ ...r, joinDate: r.joinDate || today(), fee: r.fee ?? "" }); setModal(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.phone) return showToast("নাম ও ফোন আবশ্যক", "error");
    try {
      setSaving(true);
      form.id ? await updateMember(form.id, form) : await createMember(form);
      showToast(form.id ? "সদস্য আপডেট হয়েছে ✓" : "নতুন সদস্য যোগ হয়েছে ✓");
      setModal(false);
      load();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("এই সদস্যকে মুছে ফেলবেন?")) return;
    try { await deleteMember(id); showToast("সদস্য মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="সদস্য ব্যবস্থাপনা">
        <SearchBox value={search} onChange={setSearch} placeholder="নাম / ফোন..." />
        <Btn icon="add" onClick={openAdd}>নতুন সদস্য</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট সদস্য"  value={data.length}                                         icon="members"  color="var(--primary)" />
        <StatCard label="সক্রিয়"     value={data.filter(m => m.status === "active").length}       icon="members"  color="var(--success)" />
        <StatCard label="আজীবন"      value={data.filter(m => m.category === "lifetime").length}   icon="members"  color="var(--gold)"    />
        <StatCard label="মোট চাঁদা"  value={fmtMoney(data.reduce((s, m) => s + Number(m.fee || 0), 0))} icon="accounts" color="#8b5cf6" />
      </StatsGrid>

      <Table
        loading={loading}
        cols={[
          { key: "name",     label: "নাম" },
          { key: "phone",    label: "ফোন" },
          { key: "category", label: "ক্যাটাগরি", render: r => <Badge color="var(--primary)">{CAT_LABEL[r.category] || r.category}</Badge> },
          { key: "status",   label: "অবস্থা",    render: r => <Badge color={STS_COLOR[r.status]}>{STS_LABEL[r.status] || r.status}</Badge> },
          { key: "joinDate", label: "যোগদান",    render: r => fmtDate(r.joinDate) },
          { key: "fee",      label: "চাঁদা",     render: r => fmtMoney(r.fee) },
        ]}
        rows={data}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {modal && (
        <Modal title={form.id ? "সদস্য সম্পাদনা" : "নতুন সদস্য যোগ"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            <FormGrid>
              <Field label="পূর্ণ নাম" required half><Input value={form.name}    onChange={set("name")}  placeholder="নাম লিখুন" /></Field>
              <Field label="ফোন নম্বর" required half><Input value={form.phone}   onChange={set("phone")} placeholder="01XXXXXXXXX" /></Field>
              <Field label="ক্যাটাগরি" half>
                <Select value={form.category} onChange={set("category")}>
                  <option value="general">সাধারণ</option>
                  <option value="lifetime">আজীবন</option>
                  <option value="advisor">উপদেষ্টা</option>
                </Select>
              </Field>
              <Field label="অবস্থা" half>
                <Select value={form.status} onChange={set("status")}>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                  <option value="pending">অপেক্ষমাণ</option>
                </Select>
              </Field>
              <Field label="যোগদানের তারিখ" half><Input type="date" value={form.joinDate} onChange={set("joinDate")} /></Field>
              <Field label="চাঁদার পরিমাণ (৳)" half><Input type="number" value={form.fee} onChange={set("fee")} placeholder="0" /></Field>
              <Field label="ইমেইল"><Input value={form.email}   onChange={set("email")}   placeholder="email@example.com" /></Field>
              <Field label="ঠিকানা"><Input value={form.address} onChange={set("address")} placeholder="সম্পূর্ণ ঠিকানা" /></Field>
              <Field label="মন্তব্য"><Textarea value={form.notes} onChange={set("notes")} /></Field>
            </FormGrid>
            <FormActions onCancel={() => setModal(false)} saving={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
