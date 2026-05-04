import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMember, createMember, updateMember, uploadFile } from "../api.js";
import {
  Field, Input, Select, Textarea, Btn, Toast, useToast, today,
} from "../components.jsx";

const EMPTY = {
  name: "", nameEng: "", phone: "", address: "",
  category: "general", status: "active",
  joinDate: today(), fee: "", notes: "",
  image: "",
  nidNumber: "", nidAttachment: "",
  nomineeName: "", nomineeMobile: "", nomineeAddress: "",
  nomineeImage: "", nomineeNidAttachment: "",
  // user account (add-only)
  email: "", password: "",
};

// ── File Upload Widget ──────────────────────────────────────
function FileUpload({ value, onChange, accept = "image/*" }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const isImage  = value && /\.(jpg|jpeg|png|gif|webp)$/i.test(value);

  const handleChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onChange(result.path);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value && (
        <div style={{ display: "inline-flex", alignItems: "flex-start", gap: 8 }}>
          {isImage
            ? <img src={value} alt="preview" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "2px solid var(--border)" }} />
            : <div style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                📄 {value.split("/").pop()}
              </div>
          }
          <button type="button" onClick={() => onChange("")} style={{ background: "var(--danger)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>
      )}
      <input type="file" ref={inputRef} style={{ display: "none" }} accept={accept} onChange={handleChange} />
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        disabled={uploading}
        style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed var(--border)", background: "var(--bg)", color: "var(--muted)", cursor: uploading ? "not-allowed" : "pointer", fontSize: "0.82rem", fontFamily: "inherit", fontWeight: 600, textAlign: "left" }}
      >
        {uploading ? "আপলোড হচ্ছে..." : value ? "পরিবর্তন করুন" : "ফাইল নির্বাচন করুন"}
      </button>
    </div>
  );
}

// ── Section Card ────────────────────────────────────────────
function Section({ title, hint, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
      <div style={{ borderBottom: "2px solid var(--border)", paddingBottom: "0.6rem", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)" }}>{title}</h3>
        {hint && <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const Grid2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>{children}</div>
);

// ── Main Form ───────────────────────────────────────────────
export default function MemberForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [toast,   showToast]  = useToast();

  useEffect(() => {
    if (!isEdit) return;
    getMember(id)
      .then(m => setForm({
        ...EMPTY, ...m,
        nameEng:               m.nameEng               || "",
        joinDate:              m.joinDate               || today(),
        fee:                   m.fee                    ?? "",
        nidNumber:             m.nidNumber              || "",
        nidAttachment:         m.nidAttachment          || "",
        nomineeImage:          m.nomineeImage           || "",
        nomineeName:           m.nomineeName            || "",
        nomineeMobile:         m.nomineeMobile          || "",
        nomineeAddress:        m.nomineeAddress         || "",
        nomineeNidAttachment:  m.nomineeNidAttachment   || "",
        image:                 m.image                  || "",
        email: "", password: "",
      }))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const set     = f => e => setForm(p => ({ ...p, [f]: typeof e === "string" ? e : e.target.value }));
  const setFile = f => path => setForm(p => ({ ...p, [f]: path }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim())  return showToast("নাম আবশ্যক", "error");
    if (!form.phone.trim()) return showToast("ফোন নম্বর আবশ্যক", "error");
    if (!isEdit) {
      if (!form.email.trim())    return showToast("ইমেইল আবশ্যক", "error");
      if (!form.password.trim()) return showToast("পাসওয়ার্ড আবশ্যক", "error");
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        nameEng:              form.nameEng              || null,
        fee:                  form.fee === "" ? null : Number(form.fee),
        joinDate:             form.joinDate             || null,
        image:                form.image                || null,
        nidNumber:            form.nidNumber            || null,
        nidAttachment:        form.nidAttachment        || null,
        nomineeImage:         form.nomineeImage         || null,
        nomineeName:          form.nomineeName          || null,
        nomineeMobile:        form.nomineeMobile        || null,
        nomineeAddress:       form.nomineeAddress       || null,
        nomineeNidAttachment: form.nomineeNidAttachment || null,
        // Send email+password only on create
        email:    isEdit ? undefined : (form.email    || null),
        password: isEdit ? undefined : (form.password || null),
      };
      isEdit ? await updateMember(id, payload) : await createMember(payload);
      navigate("/members");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => navigate("/members")}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: "var(--muted)", fontFamily: "inherit", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← তালিকায় ফিরুন
        </button>
        <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>
          {isEdit ? "সদস্য তথ্য সম্পাদনা" : "নতুন সদস্য যোগ"}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Section 1: Personal Info ── */}
        <Section title="ব্যক্তিগত তথ্য">
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "1rem", alignItems: "start" }}>

            {/* Profile photo */}
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>ছবি</div>
              {form.image
                ? <img src={form.image} alt="profile" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%", border: "3px solid var(--border)", display: "block", marginBottom: 6 }} />
                : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--bg)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "1.5rem", marginBottom: 6 }}>👤</div>
              }
              <input
                type="file" accept="image/*"
                style={{ display: "none" }} id="profile-img-input"
                onChange={async e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try { const r = await uploadFile(file); setForm(p => ({ ...p, image: r.path })); }
                  catch (err) { showToast(err.message, "error"); }
                  e.target.value = "";
                }}
              />
              <label htmlFor="profile-img-input" style={{ fontSize: "0.72rem", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
                {form.image ? "পরিবর্তন" : "আপলোড"}
              </label>
            </div>

            {/* Fields */}
            <Grid2>
              <Field label="পূর্ণ নাম (বাংলা)" required half>
                <Input value={form.name}    onChange={set("name")}    placeholder="নাম লিখুন" />
              </Field>
              <Field label="পূর্ণ নাম (ইংরেজি)" half>
                <Input value={form.nameEng} onChange={set("nameEng")} placeholder="Full Name in English" />
              </Field>
              <Field label="ফোন নম্বর" required half>
                <Input value={form.phone}   onChange={set("phone")}   placeholder="01XXXXXXXXX" />
              </Field>
              <Field label="ক্যাটাগরি" half>
                <Select value={form.category} onChange={set("category")}>
                  <option value="general">সাধারণ সদস্য</option>
                  <option value="Presedent">সভাপতি</option>
                  <option value="Treasure">কোষাধ্যক্ষ</option>
                </Select>
              </Field>
              <Field label="অবস্থা" half>
                <Select value={form.status} onChange={set("status")}>
                  <option value="active">সক্রিয়</option>
                  <option value="inactive">নিষ্ক্রিয়</option>
                  <option value="pending">অপেক্ষমাণ</option>
                </Select>
              </Field>
              <Field label="যোগদানের তারিখ" half>
                <Input type="date" value={form.joinDate} onChange={set("joinDate")} />
              </Field>
              <Field label="চাঁদার পরিমাণ (৳)" half>
                <Input type="number" value={form.fee} onChange={set("fee")} placeholder="0" />
              </Field>
              <div />
              <Field label="ঠিকানা" half>
                <Textarea value={form.address} onChange={set("address")} placeholder="সম্পূর্ণ ঠিকানা" />
              </Field>
              <Field label="মন্তব্য" half>
                <Textarea value={form.notes} onChange={set("notes")} placeholder="অতিরিক্ত তথ্য..." />
              </Field>
            </Grid2>
          </div>
        </Section>

        {/* ── Section 2: NID / Identity ── */}
        <Section title="পরিচয়পত্র তথ্য">
          <Grid2>
            <Field label="জাতীয় পরিচয়পত্র নম্বর" half>
              <Input value={form.nidNumber} onChange={set("nidNumber")} placeholder="NID নম্বর" />
            </Field>
            <Field label="NID স্ক্যান / ছবি" half>
              <FileUpload value={form.nidAttachment} onChange={setFile("nidAttachment")} accept="image/*,.pdf" />
            </Field>
          </Grid2>
        </Section>

        {/* ── Section 3: Nominee ── */}
        <Section title="নমিনি তথ্য">
          <Grid2>
            <Field label="নমিনির নাম" half>
              <Input value={form.nomineeName}   onChange={set("nomineeName")}   placeholder="নমিনির পূর্ণ নাম" />
            </Field>
            <Field label="নমিনির মোবাইল" half>
              <Input value={form.nomineeMobile} onChange={set("nomineeMobile")} placeholder="01XXXXXXXXX" />
            </Field>
            <Field label="নমিনির NID স্ক্যান" half>
              <FileUpload value={form.nomineeNidAttachment} onChange={setFile("nomineeNidAttachment")} accept="image/*,.pdf" />
            </Field>
            <Field label="নমিনির ঠিকানা" half>
              <Input value={form.nomineeAddress} onChange={set("nomineeAddress")} placeholder="নমিনির ঠিকানা" />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="নমিনির ছবি">
                <FileUpload value={form.nomineeImage} onChange={setFile("nomineeImage")} accept="image/*" />
              </Field>
            </div>
          </Grid2>
        </Section>

        {/* ── Section 4: User Account (add only) ── */}
        {!isEdit && (
          <Section
            title="লগইন অ্যাকাউন্ট"
            hint="সদস্যের লগইন তথ্য — এই ইমেইল ও পাসওয়ার্ড দিয়ে সিস্টেমে প্রবেশ করা যাবে"
          >
            <Grid2>
              <Field label="ইমেইল" required half>
                <Input type="email" value={form.email}    onChange={set("email")}    placeholder="email@example.com" />
              </Field>
              <Field label="পাসওয়ার্ড" required half>
                <Input type="password" value={form.password} onChange={set("password")} placeholder="কমপক্ষে ৮ অক্ষর" />
              </Field>
            </Grid2>
          </Section>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: "1rem" }}>
          <Btn variant="muted" type="button" onClick={() => navigate("/members")}>বাতিল</Btn>
          <Btn icon="save" loading={saving} type="submit">{isEdit ? "আপডেট করুন" : "সংরক্ষণ করুন"}</Btn>
        </div>

      </form>
    </div>
  );
}
