import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMembers, deleteMember, fileUrl } from "../api.js";
import { getToken } from "../auth.js";
import {
  Btn, StatCard, Table, Badge, Toast, PageHeader,
  SearchBox, StatsGrid, useToast, fmtDate, fmtMoney,
} from "../components.jsx";

const CAT_LABEL = { general: "সাধারণ", Presedent: "সভাপতি", VicePresedent: "সহ-সভাপতি", Treasure: "কোষাধ্যক্ষ", JointTreasure: "সহ-কোষাধ্যক্ষ" };
const STS_COLOR = { active: "var(--success)", inactive: "var(--danger)", pending: "var(--gold)" };
const STS_LABEL = { active: "সক্রিয়", inactive: "নিষ্ক্রিয়", pending: "অপেক্ষমাণ" };

function Avatar({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: "var(--primary)", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: "0.85rem",
    }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function Members() {
  const navigate = useNavigate();
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [toast,   showToast]  = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getMembers(search)); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async id => {
    if (!window.confirm("এই সদস্যকে মুছে ফেলবেন?")) return;
    try { await deleteMember(id); showToast("সদস্য মুছে ফেলা হয়েছে"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleDownloadAttachments = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/members/download/attachments`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `member_attachments_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("সংযুক্তি ডাউনলোড সম্পন্ন হয়েছে");
    } catch (e) {
      showToast(e.message || "ডাউনলোড ব্যর্থ হয়েছে", "error");
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="সদস্য ব্যবস্থাপনা">
        <SearchBox value={search} onChange={setSearch} placeholder="নাম / ফোন..." />
        <Btn icon="download" onClick={handleDownloadAttachments}>সংযুক্তি ডাউনলোড</Btn>
        <Btn icon="add" onClick={() => navigate("/members/new")}>নতুন সদস্য</Btn>
      </PageHeader>

      <StatsGrid>
        <StatCard label="মোট সদস্য" value={data.length}                                          icon="members"  color="var(--primary)" />
        <StatCard label="সক্রিয়"    value={data.filter(m => m.status === "active").length}        icon="members"  color="var(--success)" />
        <StatCard label="সভাপতি"    value={data.filter(m => m.category === "Presedent").length}   icon="members"  color="var(--gold)"    />
        <StatCard label="মোট চাঁদা" value={fmtMoney(data.reduce((s, m) => s + Number(m.fee || 0), 0))} icon="accounts" color="#8b5cf6" />
      </StatsGrid>

      <Table
        loading={loading}
        cols={[
          { key: "image", label: "", render: r => <Avatar src={fileUrl(r.image)} name={r.name} /> },
          { key: "name",  label: "নাম", render: r => (
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              {r.nameEng && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{r.nameEng}</div>}
            </div>
          )},
          { key: "phone",    label: "ফোন" },
          { key: "category", label: "ক্যাটাগরি", render: r => <Badge color="var(--primary)">{CAT_LABEL[r.category] || r.category}</Badge> },
          { key: "status",   label: "অবস্থা",    render: r => <Badge color={STS_COLOR[r.status]}>{STS_LABEL[r.status] || r.status}</Badge> },
          { key: "joinDate", label: "যোগদান",    render: r => fmtDate(r.joinDate) },
          { key: "fee",      label: "চাঁদা",     render: r => fmtMoney(r.fee) },
        ]}
        rows={data}
        onEdit={row => navigate(`/members/${row.id}/edit`)}
        onView={row => navigate(`/members/${row.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
