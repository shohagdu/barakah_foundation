import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMember } from "../api.js";
import { Toast, useToast, fmtDate, fmtMoney, Badge } from "../components.jsx";

const CAT_LABEL = { general: "সাধারণ সদস্য", Presedent: "সভাপতি", Treasure: "কোষাধ্যক্ষ" };
const STS_COLOR = { active: "var(--success)", inactive: "var(--danger)", pending: "var(--gold)" };
const STS_LABEL = { active: "সক্রিয়", inactive: "নিষ্ক্রিয়", pending: "অপেক্ষমাণ" };

function Section({ title, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)", paddingBottom: "0.6rem", borderBottom: "2px solid var(--border)" }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: "1rem" }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: "0.95rem", color: "var(--text)", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

function AttachmentCard({ label, url }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const fileName = url.split("/").pop();

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem 1rem", background: "var(--bg)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
        {isImage ? (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={label} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
          </a>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: "0.82rem" }}>
            <span>📄</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          </div>
        )}
      </div>
      <a
        href={url}
        download={fileName}
        target="_blank"
        rel="noreferrer"
        style={{ flexShrink: 0, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
      >
        ⬇ ডাউনলোড
      </a>
    </div>
  );
}

export default function MemberDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [member,  setMember]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast,   showToast]  = useToast();

  useEffect(() => {
    getMember(id)
      .then(setMember)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      </div>
    );
  }

  if (!member) return null;

  const hasAttachments = member.nidAttachment || member.nomineeImage || member.nomineeNidAttachment;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/members")}
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "var(--muted)", fontFamily: "inherit", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            ← তালিকায় ফিরুন
          </button>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>সদস্যের বিস্তারিত</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/members/${id}/edit`)}
          style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          ✏ সম্পাদনা
        </button>
      </div>

      {/* Profile card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        {member.image
          ? <img src={member.image} alt={member.name} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: "50%", border: "3px solid var(--border)", flexShrink: 0 }} />
          : <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 800, flexShrink: 0 }}>{member.name?.[0]?.toUpperCase() || "?"}</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{member.name}</div>
          {member.nameEng && <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 8 }}>{member.nameEng}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge color="var(--primary)">{CAT_LABEL[member.category] || member.category}</Badge>
            <Badge color={STS_COLOR[member.status]}>{STS_LABEL[member.status] || member.status}</Badge>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <Section title="ব্যক্তিগত তথ্য">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
          <InfoRow label="ফোন নম্বর"       value={member.phone} />
          <InfoRow label="যোগদানের তারিখ"   value={fmtDate(member.joinDate)} />
          <InfoRow label="চাঁদার পরিমাণ"    value={fmtMoney(member.fee)} />
          <div />
          <div style={{ gridColumn: "1 / -1" }}><InfoRow label="ঠিকানা" value={member.address} /></div>
          {member.notes && <div style={{ gridColumn: "1 / -1" }}><InfoRow label="মন্তব্য" value={member.notes} /></div>}
        </div>
      </Section>

      {/* NID Info */}
      <Section title="পরিচয়পত্র তথ্য">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
          <InfoRow label="জাতীয় পরিচয়পত্র নম্বর" value={member.nidNumber} />
          <div />
        </div>
        {member.nidAttachment && (
          <AttachmentCard label="NID স্ক্যান / ছবি" url={member.nidAttachment} />
        )}
      </Section>

      {/* Nominee Info */}
      <Section title="নমিনি তথ্য">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem", marginBottom: "0.5rem" }}>
          <InfoRow label="নমিনির নাম"     value={member.nomineeName} />
          <InfoRow label="নমিনির মোবাইল"  value={member.nomineeMobile} />
          {member.nomineeAddress && (
            <div style={{ gridColumn: "1 / -1" }}><InfoRow label="নমিনির ঠিকানা" value={member.nomineeAddress} /></div>
          )}
        </div>
        {hasAttachments && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <AttachmentCard label="নমিনির NID স্ক্যান" url={member.nomineeNidAttachment} />
            <AttachmentCard label="নমিনির ছবি"         url={member.nomineeImage} />
          </div>
        )}
      </Section>
    </div>
  );
}
