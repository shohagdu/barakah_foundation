// ================================================================
// Shared UI Components
// ================================================================
import { useState, useCallback } from "react";

// ── Helpers ────────────────────────────────────────────────
export const today    = () => new Date().toISOString().split("T")[0];
export const fmtDate  = d  => d ? new Date(d).toLocaleDateString("bn-BD") : "—";
export const fmtMoney = n  => "৳" + Number(n || 0).toLocaleString("bn-BD");

// ── Icon ───────────────────────────────────────────────────
const PATHS = {
  dashboard:   "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  members:     "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  accounts:    "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  donations:   "M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z",
  projects:    "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  beneficiary: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  meetings:    "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  add:         "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  edit:        "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  delete:      "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  close:       "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  save:        "M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z",
  menu:        "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  money_in:    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v1.5h-2v-1.51c-1.54-.3-2.73-1.29-2.74-2.74h1.71c.01.69.61 1.24 1.53 1.24 1 0 1.5-.56 1.5-1.15 0-.51-.28-.97-1.38-1.26-1.28-.33-3.12-.85-3.12-2.57 0-1.17.92-2.07 2.5-2.37V6h2v1.63c1.46.32 2.52 1.29 2.53 2.72h-1.7c-.01-.69-.58-1.19-1.46-1.19-.84 0-1.39.41-1.39 1.04 0 .51.38.83 1.44 1.12 1.06.28 3.06.78 3.06 2.71 0 1.24-.93 2.11-2.48 2.47z",
  money_out:   "M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
  trend_up:    "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  warning:     "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  check:       "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
};

export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={PATHS[name] || PATHS.dashboard} />
  </svg>
);

// ── Toast Hook ─────────────────────────────────────────────
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return [toast, show];
};

// ── Toast Component ────────────────────────────────────────
export const Toast = ({ toast }) => {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999,
      background: isErr ? "var(--danger)" : "var(--success)", color: "#fff",
      padding: "12px 18px", borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
      fontWeight: 600, fontSize: "0.875rem",
      display: "flex", alignItems: "center", gap: "8px",
      animation: "slideUp 0.25s ease",
    }}>
      <Icon name={isErr ? "warning" : "check"} size={16} />
      {toast.msg}
    </div>
  );
};

// ── Modal ──────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide = false }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
    <div style={{
      position: "relative", background: "var(--card)", borderRadius: "16px",
      width: "100%", maxWidth: wide ? "720px" : "560px",
      maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 24px 64px rgba(0,0,0,.3)", border: "1px solid var(--border)",
      animation: "modalIn 0.2s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.2rem 1.5rem", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, background: "var(--card)",
        borderRadius: "16px 16px 0 0", zIndex: 1,
      }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "4px", borderRadius: "8px", display: "flex" }}>
          <Icon name="close" />
        </button>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  </div>
);

// ── Form Primitives ────────────────────────────────────────
export const Field = ({ label, required, children, half }) => (
  <div style={{ marginBottom: "1rem", gridColumn: half ? "span 1" : "span 2" }}>
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}{required && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: "8px", background: "var(--bg)", color: "var(--text)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s" };

export const Input    = (p) => <input    {...p} style={{ ...inputStyle, ...p.style }} />;
export const Textarea = (p) => <textarea {...p} rows={3} style={{ ...inputStyle, resize: "vertical", ...p.style }} />;
export const Select   = ({ children, ...p }) => (
  <select {...p} style={{ ...inputStyle, cursor: "pointer" }}>{children}</select>
);

// ── Button ─────────────────────────────────────────────────
const BtnStyles = {
  primary: { background: "var(--primary)",  color: "#fff",           border: "none" },
  success: { background: "var(--success)",  color: "#fff",           border: "none" },
  danger:  { background: "var(--danger)",   color: "#fff",           border: "none" },
  ghost:   { background: "transparent",     color: "var(--primary)", border: "1.5px solid var(--primary)" },
  muted:   { background: "var(--border)",   color: "var(--muted)",   border: "none" },
};

export const Btn = ({ variant = "primary", icon, children, loading, ...p }) => (
  <button {...p} disabled={loading || p.disabled} style={{
    display: "inline-flex", alignItems: "center", gap: "6px",
    padding: "9px 16px", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer",
    fontSize: "0.875rem", fontWeight: 600, transition: "all .15s", fontFamily: "inherit",
    opacity: loading ? 0.7 : 1, ...BtnStyles[variant], ...p.style,
  }}>
    {icon && !loading && <Icon name={icon} size={15} />}
    {loading ? "অপেক্ষা করুন..." : children}
  </button>
);

// ── Stat Card ──────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{ background: "var(--card)", borderRadius: "14px", padding: "1.2rem", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${color}1a`, display: "flex", alignItems: "center", justifyContent: "center", color }}><Icon name={icon} size={18} /></div>
    </div>
    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: "0.73rem", color: "var(--muted)" }}>{sub}</div>}
  </div>
);

// ── Badge ──────────────────────────────────────────────────
export const Badge = ({ children, color = "var(--primary)" }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "20px", fontSize: "0.73rem", fontWeight: 700, background: `${color}1a`, color, whiteSpace: "nowrap" }}>{children}</span>
);

// ── Table ──────────────────────────────────────────────────
export const Table = ({ cols, rows, onEdit, onDelete, loading }) => {
  if (loading) return <Loader />;
  return (
    <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--bg)" }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
            {(onEdit || onDelete) && <th style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", width: 80 }} />}
          </tr>
        </thead>
        <tbody>
          {!rows || rows.length === 0
            ? <tr><td colSpan={cols.length + 1} style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)", fontSize: "0.875rem" }}>কোনো তথ্য নেই</td></tr>
            : rows.map((row, i) => (
              <tr key={row.id || i}
                style={{ borderBottom: "1px solid var(--border)", transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: "10px 14px", color: "var(--text)" }}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td style={{ padding: "6px 10px" }}>
                    <div style={{ display: "flex", gap: "2px" }}>
                      {onEdit   && <button onClick={() => onEdit(row)}   style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "5px", borderRadius: "6px", display: "flex" }}><Icon name="edit"   size={14} /></button>}
                      {onDelete && <button onClick={() => onDelete(row.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)",  padding: "5px", borderRadius: "6px", display: "flex" }}><Icon name="delete" size={14} /></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Loader ─────────────────────────────────────────────────
export const Loader = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", color: "var(--muted)", gap: "10px" }}>
    <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    <span style={{ fontSize: "0.8rem" }}>লোড হচ্ছে...</span>
  </div>
);

// ── PageHeader ─────────────────────────────────────────────
export const PageHeader = ({ title, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
    <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "var(--text)" }}>{title}</h2>
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{children}</div>
  </div>
);

// ── SearchBox ──────────────────────────────────────────────
export const SearchBox = ({ value, onChange, placeholder = "খুঁজুন..." }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
      <Icon name="members" size={14} />
    </div>
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: "8px 12px 8px 30px", border: "1.5px solid var(--border)", borderRadius: "8px", background: "var(--bg)", color: "var(--text)", fontSize: "0.875rem", outline: "none", fontFamily: "inherit", width: 200 }}
    />
  </div>
);

// ── FormGrid ───────────────────────────────────────────────
export const FormGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>{children}</div>
);

// ── FormActions ────────────────────────────────────────────
export const FormActions = ({ onCancel, saving }) => (
  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
    <Btn variant="muted" onClick={onCancel} type="button">বাতিল</Btn>
    <Btn icon="save" loading={saving} type="submit">সংরক্ষণ</Btn>
  </div>
);

// ── FilterTabs ─────────────────────────────────────────────
export const FilterTabs = ({ options, value, onChange }) => (
  <div style={{ display: "flex", gap: "6px", marginBottom: "1rem", flexWrap: "wrap" }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer",
        fontWeight: 600, fontSize: "0.8rem", fontFamily: "inherit", transition: "all .15s",
        background: value === o.value ? "var(--primary)" : "var(--border)",
        color: value === o.value ? "#fff" : "var(--muted)",
      }}>{o.label}</button>
    ))}
  </div>
);

// ── StatsGrid ──────────────────────────────────────────────
export const StatsGrid = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
    {children}
  </div>
);
