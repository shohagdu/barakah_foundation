// ================================================================
// Login & Register Page
// ================================================================
import { useState } from "react";
import { apiLogin, apiRegister, saveAuth } from "../auth.js";

const ROLES = [
  { value: "admin",      label: "অ্যাডমিন"    },
  { value: "accountant", label: "হিসাবরক্ষক"  },
  { value: "member",     label: "সদস্য"        },
  { value: "viewer",     label: "দর্শক"        },
];

export default function Login({ onAuth }) {
  const [tab,    setTab]    = useState("login");
  const [form,   setForm]   = useState({});
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("ইমেইল ও পাসওয়ার্ড দিন");
    try {
      setLoading(true);
      const res = await apiLogin(form.email, form.password);
      saveAuth(res.token, res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password)
      return setError("নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক");
    if (form.password.length < 6)
      return setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    if (form.password !== form.confirm)
      return setError("পাসওয়ার্ড মিলছে না");
    try {
      setLoading(true);
      const res = await apiRegister({
        name:     form.name,
        email:    form.email,
        password: form.password,
        mobile:   form.mobile || null,
        role:     form.role   || "member",
      });
      saveAuth(res.token, res.user);
      onAuth(res.user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--sidebar-bg)",
      fontFamily: "'Hind Siliguri', sans-serif",
      padding: "1rem",
    }}>
      {/* Background decoration */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "rgba(196,154,26,.06)" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", background: "rgba(26,107,90,.1)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, var(--gold), #a07810)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", fontWeight: 800, color: "#fff",
            boxShadow: "0 8px 24px rgba(196,154,26,.4)",
            marginBottom: "1rem",
          }}>ب</div>
          <h1 style={{ color: "#fff", fontFamily: "'Noto Serif Bengali', serif", fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px" }}>
            বারাকাহ মুশারাকাহ ফাউন্ডেশন
          </h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: "0.8rem", margin: 0 }}>ম্যানেজমেন্ট সিস্টেম</p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)", borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          overflow: "hidden",
        }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {[{ id: "login", label: "লগইন" }, { id: "register", label: "নতুন নিবন্ধন" }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(""); setForm({}); }}
                style={{
                  flex: 1, padding: "14px", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700,
                  transition: "all .15s",
                  background: tab === t.id ? "var(--card)" : "var(--bg)",
                  color: tab === t.id ? "var(--primary)" : "var(--muted)",
                  borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
                }}>{t.label}</button>
            ))}
          </div>

          <div style={{ padding: "1.75rem" }}>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "10px 14px",
                color: "var(--danger)", fontSize: "0.85rem",
                fontWeight: 600, marginBottom: "1rem",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {tab === "login" && (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>ইমেইল ঠিকানা</label>
                  <input
                    type="email" required value={form.email || ""} onChange={set("email")}
                    placeholder="your@email.com"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={labelStyle}>পাসওয়ার্ড</label>
                  <input
                    type="password" required value={form.password || ""} onChange={set("password")}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                </div>
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading ? "লগইন হচ্ছে..." : "🔐 লগইন করুন"}
                </button>

                {/* Default credentials hint */}
                <div style={{ marginTop: "1.25rem", padding: "10px 12px", background: "var(--bg)", borderRadius: 8, fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.7 }}>
                  <strong style={{ color: "var(--primary)" }}>ডিফল্ট অ্যাডমিন:</strong><br />
                  📧 admin@barakah.org &nbsp;|&nbsp; 🔑 Admin@1234
                </div>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {tab === "register" && (
              <form onSubmit={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                  <div style={{ marginBottom: "1rem", gridColumn: "span 2" }}>
                    <label style={labelStyle}>পূর্ণ নাম *</label>
                    <input value={form.name || ""} onChange={set("name")} placeholder="আপনার পূর্ণ নাম" style={inputStyle} required />
                  </div>
                  <div style={{ marginBottom: "1rem", gridColumn: "span 2" }}>
                    <label style={labelStyle}>ইমেইল ঠিকানা *</label>
                    <input type="email" value={form.email || ""} onChange={set("email")} placeholder="email@example.com" style={inputStyle} required />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>মোবাইল নম্বর</label>
                    <input value={form.mobile || ""} onChange={set("mobile")} placeholder="01XXXXXXXXX" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>ভূমিকা (Role)</label>
                    <select value={form.role || "member"} onChange={set("role")} style={inputStyle}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>পাসওয়ার্ড *</label>
                    <input type="password" value={form.password || ""} onChange={set("password")} placeholder="কমপক্ষে ৬ অক্ষর" style={inputStyle} required />
                  </div>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={labelStyle}>পাসওয়ার্ড নিশ্চিত করুন *</label>
                    <input type="password" value={form.confirm || ""} onChange={set("confirm")} placeholder="আবার লিখুন" style={inputStyle} required />
                  </div>
                </div>
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading ? "নিবন্ধন হচ্ছে..." : "✅ নিবন্ধন করুন"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: "0.7rem", marginTop: "1.25rem" }}>
          ⚡ Rust · Actix-Web &nbsp;|&nbsp; ⚛️ React · Vite &nbsp;|&nbsp; 🗄️ MySQL
        </p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: "0.75rem", fontWeight: 700,
  color: "var(--muted)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%", padding: "11px 13px",
  border: "1.5px solid var(--border)", borderRadius: 9,
  background: "var(--bg)", color: "var(--text)",
  fontSize: "0.95rem", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
  transition: "border-color .15s, box-shadow .15s",
};

const btnStyle = {
  width: "100%", padding: "13px",
  background: "var(--primary)", color: "#fff",
  border: "none", borderRadius: 10, cursor: "pointer",
  fontSize: "1rem", fontWeight: 700, fontFamily: "inherit",
  transition: "all .15s",
  boxShadow: "0 4px 14px rgba(26,107,90,.35)",
};
