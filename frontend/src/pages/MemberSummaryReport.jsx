import { useState, useCallback, useRef } from "react";
import { getMemberReport } from "../api.js";
import { Toast, useToast } from "../components.jsx";

// ── Constants ──────────────────────────────────────────────────
const BN_MONTHS = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
];

function fmtMonth(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  return `${BN_MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

const tk = n => `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function monthsBetween(from, to) {
  if (!from || !to) return [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const result = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
    if (result.length > 60) break;
  }
  return result;
}

function prevMonth(base, n) {
  let [y, m] = base.split("-").map(Number);
  for (let i = 0; i < n; i++) { m--; if (m < 1) { m = 12; y--; } }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ── MonthYearSelect ────────────────────────────────────────────
function MonthYearSelect({ label, value, onChange }) {
  const parts    = value ? value.split("-") : ["", ""];
  const selYear  = parts[0] || "";
  const selMonth = parts[1] || "";
  const curYear  = new Date().getFullYear();
  const years    = [];
  for (let y = curYear + 1; y >= 2020; y--) years.push(y);

  const sel = {
    border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", fontFamily: "inherit", fontSize: "0.875rem",
    color: "var(--text)", background: "var(--card)", cursor: "pointer", minWidth: 130,
  };

  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={selMonth} onChange={e => { const m = e.target.value; if (m && selYear) onChange(`${selYear}-${m}`); else if (m) onChange(`${curYear}-${m}`); }} style={sel}>
          <option value="">— মাস —</option>
          {BN_MONTHS.map((name, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>)}
        </select>
        <select value={selYear} onChange={e => { const y = e.target.value; if (y && selMonth) onChange(`${y}-${selMonth}`); else if (y) onChange(`${y}-01`); }} style={{ ...sel, minWidth: 90 }}>
          <option value="">— বছর —</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Filter Panel ───────────────────────────────────────────────
function FilterPanel({ from, to, onFrom, onTo, onFetch, loading }) {
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const curMM = String(now.getMonth() + 1).padStart(2, "0");

  const presets = [
    { label: "এই বছর",    from: `${yyyy}-01`,                     to: `${yyyy}-${curMM}` },
    { label: "শেষ ৩ মাস", from: prevMonth(`${yyyy}-${curMM}`, 2), to: `${yyyy}-${curMM}` },
    { label: "শেষ ৬ মাস", from: prevMonth(`${yyyy}-${curMM}`, 5), to: `${yyyy}-${curMM}` },
    { label: "গত বছর",    from: `${yyyy - 1}-01`,                 to: `${yyyy - 1}-12`   },
  ];

  const months = monthsBetween(from, to);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center", marginRight: 4 }}>দ্রুত নির্বাচন:</span>
        {presets.map(p => {
          const active = p.from === from && p.to === to;
          return (
            <button key={p.label} onClick={() => { onFrom(p.from); onTo(p.to); }} style={{
              padding: "4px 14px", borderRadius: 20, border: "1.5px solid",
              borderColor: active ? "var(--primary)" : "var(--border)",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
            }}>{p.label}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <MonthYearSelect label="শুরু মাস — বছর" value={from} onChange={onFrom} />
        <div style={{ fontSize: "1.3rem", color: "var(--muted)", paddingBottom: 6 }}>→</div>
        <MonthYearSelect label="শেষ মাস — বছর" value={to} onChange={onTo} />
        <button onClick={onFetch} disabled={loading} style={{
          padding: "9px 26px", borderRadius: 9, border: "none",
          background: "var(--primary)", color: "#fff",
          fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          alignSelf: "flex-end",
        }}>{loading ? "লোড হচ্ছে..." : "প্রদর্শন করুন"}</button>
      </div>

      {months.length > 0 && (
        <div style={{ marginTop: "0.9rem", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap" }}>নির্বাচিত {months.length} মাস:</span>
          {months.map(ym => (
            <span key={ym} style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: "rgba(26,107,90,.1)", color: "var(--primary)" }}>
              {fmtMonth(ym)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Print styles ───────────────────────────────────────────────
const PRINT_STYLE = `
  @media screen {
    .org-print-header { display: none; }
  }
  @media print {
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 25.4mm 10mm;
    }
    @page {
      @bottom-center {
        content: "পৃষ্ঠা " counter(page) " / " counter(pages);
        font-size: 9pt;
        font-family: sans-serif;
      }
    }
    body { visibility: hidden; margin: 0; padding: 0; }
    #summary-print-area {
      visibility: visible;
      position: absolute;
      top: 0; left: 0;
      width: 100%;
    }
    #summary-print-area * { visibility: visible; }

    .no-print { display: none !important; visibility: hidden !important; }
    .org-print-header { display: table-row !important; visibility: visible !important; }

    table { border-collapse: collapse !important; width: 100% !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr    { page-break-inside: avoid; }
    th, td {
      border: 1.5px solid #000 !important;
      padding: 5px 8px !important;
      font-size: 9pt !important;
      visibility: visible !important;
    }
    .print-col-header th {
      background: #222 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-foot-row td {
      background: #222 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function MemberSummaryReport() {
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const curMM = String(now.getMonth() + 1).padStart(2, "0");

  const [from,    setFrom]    = useState(`${yyyy}-01`);
  const [to,      setTo]      = useState(`${yyyy}-${curMM}`);
  const [rows,    setRows]    = useState([]);
  const [months,  setMonths]  = useState([]);
  const [stats,   setStats]   = useState({ total: 0, paid: 0, unpaid: 0, members: 0 });
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [toast,   showToast]  = useToast();

  const fetch = useCallback(async () => {
    if (!from || !to) return showToast("মাস নির্বাচন করুন", "error");
    setLoading(true);
    try {
      const data = await getMemberReport({ from_month: from, to_month: to });
      const mths = monthsBetween(from, to);

      // Build deposit lookup: {memberId}-{depositMonth} → deposit row
      const depMap = {};
      for (const d of data.deposits || []) {
        depMap[`${d.memberId}-${d.depositMonth}`] = d;
      }

      // Build flat rows: for each member × each month
      const summaryMap = {};
      for (const s of data.summary || []) summaryMap[s.memberId] = s;

      const flatRows = [];
      let sl = 1;
      let totalPaid = 0, totalUnpaid = 0;

      for (const mth of mths) {
        for (const s of data.summary || []) {
          const dep    = depMap[`${s.memberId}-${mth}`];
          const isPaid = dep?.status === "paid";
          const amount = dep ? Number(dep.amount) : 0;

          flatRows.push({
            sl:          sl++,
            memberId:    s.memberId,
            memberName:  s.memberName || "—",
            address:     s.address || "—",
            month:       mth,
            monthLabel:  fmtMonth(mth),
            paymentDate: dep?.depositDate || null,
            amount,
            status:      dep?.status || "unpaid",
            hasDep:      !!dep,
          });

          if (isPaid)   totalPaid   += amount;
          else if (dep) totalUnpaid += amount;
        }
      }

      setRows(flatRows);
      setMonths(mths);
      setStats({
        total:   totalPaid + totalUnpaid,
        paid:    totalPaid,
        unpaid:  totalUnpaid,
        members: (data.summary || []).length,
      });
      setFetched(true);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [from, to]);

  // ── Table Styles ──────────────────────────────────────────────
  const th = {
    padding: "9px 10px", background: "#0d3528", color: "#fff",
    fontSize: "0.75rem", fontWeight: 700, textAlign: "left",
    border: "1px solid #000", whiteSpace: "nowrap",
  };
  const td = (extra = {}) => ({
    padding: "8px 10px", fontSize: "0.82rem",
    border: "1px solid #000", ...extra,
  });

  const orgName = "বারাকাহ মুশারাকাহ ফাউন্ডেশন";

  return (
    <div>
      <style>{PRINT_STYLE}</style>
      <Toast toast={toast} />

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>সদস্য চাঁদা সারসংক্ষেপ</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>সকল সদস্যের মাসিক চাঁদার একত্রিত প্রতিবেদন</p>
        </div>
        {fetched && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={{
              padding: "9px 20px", borderRadius: 9, border: "1.5px solid #0d3528",
              background: "transparent", color: "#0d3528",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            }}>🖨️ প্রিন্ট</button>
            <button onClick={() => {
              const d    = new Date();
              const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              const datebn = d.toLocaleDateString("bn-BD");

              // Build table rows HTML directly from data
              const bodyRows = rows.map((r, i) => {
                const isPaid    = r.status === "paid";
                const isUnpaid  = r.status === "unpaid" && r.hasDep;
                const isMissing = !r.hasDep;
                const monthIndex = months.indexOf(r.month);
                const rowBg = isMissing ? "#fffbf0" : isUnpaid ? "#fee2e2" : monthIndex % 2 === 0 ? "#f5f9f7" : "#fff";
                const amtColor  = isPaid ? "#15803d" : isMissing ? "#999" : "#dc2626";
                const badgeBg   = isPaid ? "#dcfce7" : isMissing ? "#fef9c3" : "#fee2e2";
                const badgeTxt  = isPaid ? "#15803d" : isMissing ? "#854d0e" : "#dc2626";
                const badgeLabel= isPaid ? "পরিশোধিত" : isMissing ? "রেকর্ড নেই" : "বকেয়া";
                return `<tr style="background:${rowBg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
                  <td style="text-align:center;color:#888;font-size:8.5pt;">${r.sl}</td>
                  <td style="font-weight:600;">${r.memberName}</td>
                  <td style="color:#555;">${r.address}</td>
                  <td style="font-weight:600;">${r.monthLabel}</td>
                  <td style="color:${r.paymentDate?"#000":"#aaa"};">${r.paymentDate ? fmtDate(r.paymentDate) : "—"}</td>
                  <td style="text-align:right;font-weight:700;color:${amtColor};">${isMissing ? "০.০০" : tk(r.amount)}</td>
                  <td style="text-align:center;">
                    <span style="background:${badgeBg};color:${badgeTxt};padding:2px 9px;border-radius:20px;font-size:8pt;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${badgeLabel}</span>
                  </td>
                </tr>`;
              }).join("");

              const win = window.open("", "_blank");
              win.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8"/>
<title>চাঁদা_সারসংক্ষেপ_${date}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@700;800&display=swap"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Hind Siliguri',sans-serif;background:#fff;color:#000;}
  @page{
    size:A4 portrait;
    margin:12mm 10mm 20mm 10mm;
  }
  @page{@bottom-right{
    content:"পৃষ্ঠা " counter(page) " / " counter(pages);
    font-size:8.5pt;font-family:'Hind Siliguri',sans-serif;color:#555;
  }}
  @page{@bottom-left{
    content:"তারিখ: ${datebn}";
    font-size:8.5pt;font-family:'Hind Siliguri',sans-serif;color:#555;
  }}
  table{border-collapse:collapse;width:100%;font-family:'Hind Siliguri',sans-serif;}
  thead{display:table-header-group;}
  tfoot{display:table-footer-group;}
  tr{page-break-inside:avoid;}
  th,td{border:1px solid #222;padding:5px 8px;font-size:9pt;}
  .hdr-org{text-align:center;padding:10px 8px 6px;border:none;border-bottom:none;}
  .hdr-sub{text-align:center;padding:2px 8px;border:none;}
  .hdr-period{text-align:center;padding:2px 8px 8px;border:none;border-bottom:2px solid #222;}
  .col-hdr th{background:#1a3a2a;color:#fff;font-size:8.5pt;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-color:#000;}
  .foot-paid td{background:#1a3a2a;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-color:#000;}
  .foot-unpaid td{background:#7f1d1d;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-color:#000;}
</style>
</head>
<body>
<table>
  <thead>
    <tr><td colspan="7" class="hdr-org">
      <div style="font-family:'Noto Serif Bengali',serif;font-size:15pt;font-weight:800;color:#000;">বারাকাহ মুশারাকাহ ফাউন্ডেশন</div>
    </td></tr>
    <tr><td colspan="7" class="hdr-sub">
      <div style="font-size:11pt;font-weight:700;">সদস্য চাঁদা সারসংক্ষেপ প্রতিবেদন</div>
    </td></tr>
    <tr><td colspan="7" class="hdr-period">
      <div style="font-size:9pt;color:#444;">সময়কাল: ${fmtMonth(from)} — ${fmtMonth(to)}</div>
    </td></tr>
    <tr class="col-hdr">
      <th style="width:38px;text-align:center;">ক্র.নং</th>
      <th>সদস্যের নাম</th>
      <th>ঠিকানা</th>
      <th>মাসের নাম</th>
      <th>পরিশোধ তারিখ</th>
      <th style="text-align:right;">পরিমাণ</th>
      <th style="text-align:center;">অবস্থা</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr class="foot-paid">
      <td colspan="5" style="font-size:9.5pt;">সর্বমোট পরিশোধিত</td>
      <td style="text-align:right;font-size:10pt;">${tk(stats.paid)}</td>
      <td></td>
    </tr>
    ${stats.unpaid > 0 ? `<tr class="foot-unpaid">
      <td colspan="5" style="font-size:9.5pt;">মোট বকেয়া</td>
      <td style="text-align:right;font-size:10pt;">${tk(stats.unpaid)}</td>
      <td></td>
    </tr>` : ""}
  </tfoot>
</table>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`);
              win.document.close();
            }} style={{
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: "#0d3528", color: "#fff",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            }}>⬇ PDF — {new Date().toLocaleDateString("bn-BD")}</button>
          </div>
        )}
      </div>

      {/* ── Filter ── */}
      <FilterPanel from={from} to={to} onFrom={setFrom} onTo={setTo} onFetch={fetch} loading={loading} />

      {/* ── Summary cards ── */}
      {fetched && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "মোট সদস্য",      val: `${stats.members} জন`,  color: "var(--primary)" },
            { label: "মোট চাঁদা",       val: tk(stats.total),         color: "var(--text)"    },
            { label: "পরিশোধিত",        val: tk(stats.paid),          color: "var(--success)" },
            { label: "বকেয়া",           val: tk(stats.unpaid),        color: "var(--danger)"  },
          ].map(c => (
            <div key={c.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "0.9rem 1.2rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: c.color }}>{c.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Printable Report ── */}
      {fetched && (
        <div id="summary-print-area">
          <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            {/* Screen-only sub-header */}
            <div className="no-print" style={{ padding: "1rem 1.2rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--text)" }}>
                সময়কাল: <span style={{ color: "var(--primary)" }}>{fmtMonth(from)} — {fmtMonth(to)}</span>
                <span style={{ marginLeft: 12, color: "var(--muted)", fontWeight: 500, fontSize: "0.82rem" }}>
                  ({rows.length} টি রেকর্ড, {stats.members} জন সদস্য, {months.length} মাস)
                </span>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  {/* Org header — hidden on screen, repeats on every print page */}
                  <tr className="org-print-header">
                    <td colSpan={7} style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "center", background: "#fff" }}>
                      <div style={{ fontFamily: "'Noto Serif Bengali',serif", fontSize: "13pt", fontWeight: 800 }}>{orgName}</div>
                      <div style={{ fontSize: "11pt", fontWeight: 700, marginTop: 2 }}>সদস্য চাঁদা সারসংক্ষেপ প্রতিবেদন</div>
                      <div style={{ fontSize: "9pt", marginTop: 2 }}>সময়কাল: {fmtMonth(from)} — {fmtMonth(to)}</div>
                    </td>
                  </tr>
                  <tr className="print-col-header">
                    <th style={{ ...th, width: 45, textAlign: "center" }}>ক্র.নং</th>
                    <th style={th}>সদস্যের নাম</th>
                    <th style={th}>ঠিকানা</th>
                    <th style={th}>মাসের নাম</th>
                    <th style={th}>পরিশোধ তারিখ</th>
                    <th style={{ ...th, textAlign: "right" }}>পরিমাণ</th>
                    <th style={{ ...th, textAlign: "center" }}>অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const isPaid    = r.status === "paid";
                    const isUnpaid  = r.status === "unpaid" && r.hasDep;
                    const isMissing = !r.hasDep;

                    // Shade alternate month groups
                    const monthIndex = months.indexOf(r.month);
                    const isEvenMonth = monthIndex % 2 === 0;
                    const rowBg = isMissing
                      ? "#fffbf0"
                      : isUnpaid
                      ? "#fff5f5"
                      : isEvenMonth ? "#f8fafb" : "transparent";

                    return (
                      <tr key={`${r.memberId}-${r.month}`} style={{ background: rowBg }}>
                        <td style={{ ...td({ textAlign: "center", color: "var(--muted)", fontSize: "0.75rem" }) }}>{r.sl}</td>
                        <td style={td({ fontWeight: 600 })}>{r.memberName}</td>
                        <td style={{ ...td({ color: "var(--muted)", fontSize: "0.78rem" }) }}>{r.address}</td>
                        <td style={td({ fontWeight: 600 })}>{r.monthLabel}</td>
                        <td style={td({ color: r.paymentDate ? "var(--text)" : "var(--muted)" })}>
                          {r.paymentDate ? fmtDate(r.paymentDate) : "—"}
                        </td>
                        <td style={{ ...td({ textAlign: "right", fontWeight: 700, color: isMissing ? "var(--muted)" : isPaid ? "var(--success)" : "var(--danger)" }) }}>
                          {isMissing ? "০.০০" : tk(r.amount)}
                        </td>
                        <td style={{ ...td({ textAlign: "center" }) }}>
                          <span style={{
                            padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
                            background: isPaid ? "#dcfce7" : isMissing ? "#fef9c3" : "#fee2e2",
                            color:      isPaid ? "#15803d" : isMissing ? "#854d0e" : "#dc2626",
                          }}>
                            {isPaid ? "পরিশোধিত" : isMissing ? "রেকর্ড নেই" : "বকেয়া"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer totals */}
                <tfoot>
                  <tr className="print-foot-row" style={{ background: "#0d3528", color: "#fff" }}>
                    <td colSpan={5} style={{ padding: "10px 12px", fontWeight: 800, fontSize: "0.9rem", border: "1px solid #000" }}>সর্বমোট পরিশোধিত</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: "1rem", border: "1px solid #000" }}>{tk(stats.paid)}</td>
                    <td style={{ padding: "10px 12px", border: "1px solid #000" }} />
                  </tr>
                  {stats.unpaid > 0 && (
                    <tr className="print-foot-row" style={{ background: "#7f1d1d", color: "#fff" }}>
                      <td colSpan={5} style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.85rem", border: "1px solid #000" }}>মোট বকেয়া</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, border: "1px solid #000" }}>{tk(stats.unpaid)}</td>
                      <td style={{ border: "1px solid #000" }} />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {!fetched && !loading && (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>মাস ও বছর নির্বাচন করুন</div>
          <div style={{ fontSize: "0.82rem" }}>তারপর "প্রদর্শন করুন" বাটনে ক্লিক করুন</div>
        </div>
      )}
    </div>
  );
}
