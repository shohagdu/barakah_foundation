import { useState, useEffect, useCallback } from "react";
import { getMemberReport } from "../api.js";
import { Badge, Toast, PageHeader, useToast, Loader } from "../components.jsx";

const tk = n => `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BN_MONTHS = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
];

// "2026-03" → "মার্চ ২০২৬"
function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const bn = BN_MONTHS[parseInt(m, 10) - 1] || m;
  return `${bn} ${y}`;
}

// Generate list of YYYY-MM strings between from and to (inclusive)
function monthsBetween(from, to) {
  if (!from || !to) return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const result = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
    if (result.length > 60) break; // safety
  }
  return result;
}

// ── Stat card ─────────────────────────────────────────────────
function SCard({ label, value, color = "var(--primary)" }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderLeft: `4px solid ${color}`, borderRadius: 12,
      padding: "0.9rem 1.2rem", flex: "1 1 140px",
    }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function prevMonth(base, n) {
  let [y, m] = base.split("-").map(Number);
  for (let i = 0; i < n; i++) { m--; if (m < 1) { m = 12; y--; } }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ── Separate month + year dropdowns ───────────────────────────
function MonthYearSelect({ label, value, onChange }) {
  const parts  = value ? value.split("-") : ["", ""];
  const selYear  = parts[0] || "";
  const selMonth = parts[1] || "";

  const curYear = new Date().getFullYear();
  const years   = [];
  for (let y = curYear + 1; y >= 2020; y--) years.push(y);

  const sel = {
    border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", fontFamily: "inherit", fontSize: "0.875rem",
    color: "var(--text)", background: "var(--card)", cursor: "pointer",
    appearance: "auto", minWidth: 130,
  };

  const setMonth = mm => {
    const y = selYear || curYear;
    if (mm) onChange(`${y}-${mm}`);
  };
  const setYear = yy => {
    const m = selMonth || "01";
    if (yy) onChange(`${yy}-${m}`);
  };

  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={selMonth} onChange={e => setMonth(e.target.value)} style={sel}>
          <option value="">— মাস —</option>
          {BN_MONTHS.map((name, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
        <select value={selYear} onChange={e => setYear(e.target.value)} style={{ ...sel, minWidth: 90 }}>
          <option value="">— বছর —</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Month filter panel ────────────────────────────────────────
function MonthFilter({ from, to, onFrom, onTo, onFetch, loading }) {
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const curMM = String(now.getMonth() + 1).padStart(2, "0");

  const presets = [
    { label: "এই বছর",    from: `${yyyy}-01`,                      to: `${yyyy}-${curMM}` },
    { label: "শেষ ৩ মাস", from: prevMonth(`${yyyy}-${curMM}`, 2),  to: `${yyyy}-${curMM}` },
    { label: "শেষ ৬ মাস", from: prevMonth(`${yyyy}-${curMM}`, 5),  to: `${yyyy}-${curMM}` },
    { label: "গত বছর",    from: `${yyyy - 1}-01`,                  to: `${yyyy - 1}-12`   },
  ];

  const months = monthsBetween(from, to);

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem",
    }}>
      {/* Quick presets */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center", marginRight: 4 }}>
          দ্রুত নির্বাচন:
        </span>
        {presets.map(p => {
          const active = p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              onClick={() => { onFrom(p.from); onTo(p.to); }}
              style={{
                padding: "4px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: active ? "var(--primary)" : "var(--border)",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
              }}
            >{p.label}</button>
          );
        })}
      </div>

      {/* Month + Year selects */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <MonthYearSelect label="শুরু মাস — বছর" value={from} onChange={onFrom} />
        <div style={{ fontSize: "1.3rem", color: "var(--muted)", paddingBottom: 6 }}>→</div>
        <MonthYearSelect label="শেষ মাস — বছর" value={to} onChange={onTo} />

        <button
          onClick={onFetch}
          disabled={loading}
          style={{
            padding: "9px 26px", borderRadius: 9, border: "none",
            background: "var(--primary)", color: "#fff",
            fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            alignSelf: "flex-end",
          }}
        >
          {loading ? "লোড হচ্ছে..." : "প্রদর্শন করুন"}
        </button>
      </div>

      {/* Selected running months chips */}
      {months.length > 0 && (
        <div style={{ marginTop: "0.9rem", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>
            নির্বাচিত {months.length} মাস:
          </span>
          {months.map(ym => (
            <span key={ym} style={{
              padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
              background: "rgba(26,107,90,.1)", color: "var(--primary)",
            }}>{fmtMonth(ym)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-member transaction block ──────────────────────────────
function MemberBlock({ summary, deposits, fines }) {
  const outstanding = (+(summary.depositUnpaid || 0)) + (+(summary.fineUnpaid || 0));
  const allOk = outstanding <= 0;

  const thS = {
    padding: "8px 14px", textAlign: "left", fontWeight: 700,
    color: "var(--muted)", fontSize: "0.7rem",
    textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  };
  const tdS = { padding: "9px 14px", color: "var(--text)", fontSize: "0.875rem" };

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, marginBottom: "1rem", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.85rem 1.25rem",
        background: allOk ? "rgba(22,163,74,.05)" : "rgba(220,38,38,.04)",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: allOk ? "rgba(22,163,74,.15)" : "rgba(220,38,38,.12)",
            color: allOk ? "var(--success)" : "var(--danger)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: "1.1rem",
          }}>
            {summary.memberName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{summary.memberName}</div>
            {summary.category && <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{summary.category}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            চাঁদা মোট <strong style={{ color: "var(--text)" }}>{tk(summary.depositTotal)}</strong>
          </span>
          {+(summary.fineTotal || 0) > 0 && (
            <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              জরিমানা <strong style={{ color: "var(--text)" }}>{tk(summary.fineTotal)}</strong>
            </span>
          )}
          <Badge color={allOk ? "var(--success)" : "var(--danger)"}>
            {allOk ? "✓ সম্পূর্ণ পরিশোধিত" : `বকেয়া ${tk(outstanding)}`}
          </Badge>
        </div>
      </div>

      {/* Deposit rows */}
      {deposits.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th style={thS}>মাস</th>
                <th style={thS}>চাঁদার পরিমাণ</th>
                <th style={thS}>পরিশোধ তারিখ</th>
                <th style={thS}>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 ? "var(--bg)" : "transparent" }}>
                  <td style={tdS}>{fmtMonth(d.depositMonth)}</td>
                  <td style={tdS}>{tk(d.amount)}</td>
                  <td style={tdS}>{d.depositDate || "—"}</td>
                  <td style={tdS}>
                    <Badge color={d.status === "paid" ? "var(--success)" : "var(--danger)"}>
                      {d.status === "paid" ? "পরিশোধিত" : "বকেয়া"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--bg)", borderTop: "2px solid var(--border)", fontWeight: 700, fontSize: "0.82rem" }}>
                <td style={{ ...tdS, color: "var(--muted)" }}>{deposits.length} মাস</td>
                <td style={tdS}>{tk(summary.depositTotal)}</td>
                <td style={tdS} />
                <td style={tdS}>
                  <span style={{ color: "var(--success)", marginRight: 8 }}>✓ {summary.paidMonths}</span>
                  <span style={{ color: "var(--danger)" }}>✗ {summary.unpaidMonths}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Fine rows */}
      {fines.length > 0 && (
        <div style={{ overflowX: "auto", borderTop: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(196,154,26,.07)" }}>
                <th style={{ ...thS, color: "var(--gold)" }} colSpan={4}>জরিমানার বিবরণ</th>
              </tr>
              <tr style={{ background: "rgba(196,154,26,.04)" }}>
                <th style={thS}>তারিখ</th>
                <th style={thS}>পরিমাণ</th>
                <th style={thS}>কারণ</th>
                <th style={thS}>অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 ? "var(--bg)" : "transparent" }}>
                  <td style={tdS}>{f.fineDate}</td>
                  <td style={tdS}>{tk(f.fineAmount)}</td>
                  <td style={tdS}>{f.reason || "—"}</td>
                  <td style={tdS}>
                    <Badge color={f.status === "paid" ? "var(--success)" : "var(--danger)"}>
                      {f.status === "paid" ? "পরিশোধিত" : "বকেয়া"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function MemberReport() {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const curMM = String(now.getMonth() + 1).padStart(2, "0");

  const [from, setFrom]       = useState(`${yyyy}-01`);
  const [to,   setTo]         = useState(`${yyyy}-${curMM}`);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, showToast]    = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getMemberReport({ from_month: from || null, to_month: to || null }));
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  // Group deposits and fines by member_id
  const depositsByMember = {};
  const finesByMember    = {};
  if (data) {
    (data.deposits || []).forEach(d => {
      (depositsByMember[d.memberId] ||= []).push(d);
    });
    (data.fines || []).forEach(f => {
      (finesByMember[f.memberId] ||= []).push(f);
    });
  }

  const summary          = data?.summary || [];
  const totalDepositTotal  = summary.reduce((s, r) => s + (+(r.depositTotal  || 0)), 0);
  const totalDepositPaid   = summary.reduce((s, r) => s + (+(r.depositPaid   || 0)), 0);
  const totalDepositUnpaid = summary.reduce((s, r) => s + (+(r.depositUnpaid || 0)), 0);
  const totalFineUnpaid    = summary.reduce((s, r) => s + (+(r.fineUnpaid    || 0)), 0);

  // Range label for page header subtitle
  const rangeLabel = (from && to)
    ? `${fmtMonth(from)} — ${fmtMonth(to)}`
    : "";

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="সদস্যভিত্তিক লেনদেন">
        {rangeLabel && (
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>
            {rangeLabel}
          </span>
        )}
      </PageHeader>

      <MonthFilter
        from={from} to={to}
        onFrom={setFrom} onTo={setTo}
        onFetch={load} loading={loading}
      />

      {loading && <Loader />}

      {!loading && data && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.75rem" }}>
            <SCard label="সদস্য"         value={summary.length}            color="var(--primary)" />
            <SCard label="মোট চাঁদা"      value={tk(totalDepositTotal)}    color="var(--primary)" />
            <SCard label="আদায়"           value={tk(totalDepositPaid)}     color="var(--success)" />
            <SCard label="চাঁদা বকেয়া"   value={tk(totalDepositUnpaid)}   color="var(--danger)" />
            <SCard label="জরিমানা বকেয়া" value={tk(totalFineUnpaid)}      color="var(--gold)" />
          </div>

          {summary.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "3rem", color: "var(--muted)",
              background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)",
            }}>
              নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি
            </div>
          ) : (
            summary.map(s => (
              <MemberBlock
                key={s.memberId}
                summary={s}
                deposits={depositsByMember[s.memberId] || []}
                fines={finesByMember[s.memberId]    || []}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
