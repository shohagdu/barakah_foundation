import { useState, useCallback, useEffect } from "react";
import { getMemberSummaryReport } from "../api.js";
import { Toast, useToast } from "../components.jsx";

// ── Helpers ────────────────────────────────────────────────────
const BN_MONTHS = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
];

function fmtMonth(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  return `${BN_MONTHS[parseInt(m, 10) - 1] || m}, ${y}`;
}

const money = n => `৳${(+(n || 0)).toLocaleString("en-IN")}`;

function prevMonth(base, n) {
  let [y, m] = base.split("-").map(Number);
  for (let i = 0; i < n; i++) { m--; if (m < 1) { m = 12; y--; } }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ── MonthYearSelect ────────────────────────────────────────────
function MonthYearSelect({ label, value, onChange }) {
  const parts   = value ? value.split("-") : ["", ""];
  const selYear = parts[0] || "";
  const selMon  = parts[1] || "";
  const curYear = new Date().getFullYear();
  const years   = [];
  for (let y = curYear + 1; y >= 2020; y--) years.push(y);

  const sel = {
    border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", fontFamily: "inherit", fontSize: "0.875rem",
    color: "var(--text)", background: "var(--card)", cursor: "pointer",
  };

  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={selMon} style={{ ...sel, minWidth: 130 }}
          onChange={e => { const m = e.target.value; onChange(m ? `${selYear || curYear}-${m}` : value); }}>
          <option value="">— মাস —</option>
          {BN_MONTHS.map((name, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
        <select value={selYear} style={{ ...sel, minWidth: 90 }}
          onChange={e => { const y = e.target.value; onChange(y ? `${y}-${selMon || "01"}` : value); }}>
          <option value="">— বছর —</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Print CSS ──────────────────────────────────────────────────
const PRINT_STYLE = `
  @media screen  { .org-hdr { display: none; } }
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    body { visibility: hidden; margin: 0; }
    #pivot-area { visibility: visible; position: absolute; top: 0; left: 0; width: 100%; }
    #pivot-area * { visibility: visible; }
    .no-print  { display: none !important; }
    .org-hdr   { display: table-row !important; visibility: visible !important; }
    table { border-collapse: collapse !important; width: 100% !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr    { page-break-inside: avoid; }
    th, td { border: 1px solid #000 !important; font-size: 8pt !important; padding: 4px 6px !important; }
    .th-dark th { background: #0d3528 !important; color: #fff !important;
                  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tf-dark td { background: #0d3528 !important; color: #fff !important;
                  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tf-grand   { background: #164d3a !important;
                  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

// ── PDF opener ─────────────────────────────────────────────────
function openPdf({ months, members, colTotals, grandTotal, from, to }) {
  const d      = new Date();
  const datebn = d.toLocaleDateString("bn-BD");
  const cols   = months.length + 3;

  const colHdrs = months.map(mo => `<th>${fmtMonth(mo)}</th>`).join("");

  const bodyRows = members.map((m, i) => {
    const cells = months.map(mo => {
      const amt = +(m.monthly?.[mo] || 0);
      return `<td style="text-align:right;${amt > 0 ? "color:#15803d;font-weight:700;" : "color:#aaa;"}">${amt > 0 ? money(amt) : "—"}</td>`;
    }).join("");
    const total = +(m.total || 0);
    const bg    = i % 2 === 0 ? "#f5f9f7" : "#fff";
    return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
      <td style="text-align:center;color:#888;font-size:7.5pt;">${i + 1}</td>
      <td style="font-weight:600;">${m.memberName || "—"}</td>
      ${cells}
      <td style="text-align:right;font-weight:800;background:#eef6f2;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${total > 0 ? money(total) : "—"}</td>
    </tr>`;
  }).join("");

  const footCells = months.map(mo => {
    const s = +(colTotals[mo] || 0);
    return `<td style="text-align:right;">${s > 0 ? money(s) : "—"}</td>`;
  }).join("");

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html>
<html lang="bn"><head><meta charset="utf-8"/>
<title>সার্বিক_চাঁদা_প্রতিবেদন</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Serif+Bengali:wght@700;800&display=swap"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Hind Siliguri',sans-serif;background:#fff;color:#000;}
  @page{size:A4 landscape;margin:10mm;}
  @page{@bottom-right{content:"পৃষ্ঠা " counter(page) " / " counter(pages);font-size:7.5pt;font-family:'Hind Siliguri',sans-serif;color:#555;}}
  @page{@bottom-left{content:"তারিখ: ${datebn}";font-size:7.5pt;font-family:'Hind Siliguri',sans-serif;color:#555;}}
  table{border-collapse:collapse;width:100%;}
  thead{display:table-header-group;}
  tfoot{display:table-footer-group;}
  tr{page-break-inside:avoid;}
  th,td{border:1px solid #333;padding:4px 6px;font-size:8pt;}
  .col-hdr th{background:#0d3528;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .foot-row td{background:#0d3528;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .ft-grand{background:#164d3a !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
</style>
</head><body>
<table>
  <thead>
    <tr><td colspan="${cols}" style="border:none;padding:8px 6px 4px;text-align:center;">
      <div style="font-family:'Noto Serif Bengali',serif;font-size:14pt;font-weight:800;">বারাকাহ মুশারাকাহ ফাউন্ডেশন</div>
    </td></tr>
    <tr><td colspan="${cols}" style="border:none;padding:2px 6px 3px;text-align:center;">
      <div style="font-size:10.5pt;font-weight:700;">সার্বিক চাঁদা প্রতিবেদন</div>
    </td></tr>
    <tr><td colspan="${cols}" style="border:none;padding:2px 6px 7px;text-align:center;border-bottom:2px solid #222;">
      <div style="font-size:8.5pt;color:#444;">সময়কাল: ${from && to ? `${fmtMonth(from)} — ${fmtMonth(to)}` : "সকল সময়"}</div>
    </td></tr>
    <tr class="col-hdr">
      <th style="width:32px;text-align:center;">ক্র.নং</th>
      <th style="min-width:130px;text-align:left;">সদস্যের নাম</th>
      ${colHdrs}
      <th style="min-width:90px;text-align:right;background:#164d3a !important;">মোট</th>
    </tr>
  </thead>
  <tbody>${bodyRows}</tbody>
  <tfoot>
    <tr class="foot-row">
      <td colspan="2">সর্বমোট</td>
      ${footCells}
      <td class="ft-grand" style="text-align:right;font-size:9pt;">${money(grandTotal)}</td>
    </tr>
  </tfoot>
</table>
<script>window.onload=()=>{window.print();};<\/script>
</body></html>`);
  win.document.close();
}

// ── Main Component ─────────────────────────────────────────────
export default function MemberOverallSummaryReport() {
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const curMM = String(now.getMonth() + 1).padStart(2, "0");

  const [from,    setFrom]    = useState("");
  const [to,      setTo]      = useState("");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [toast,   showToast]  = useToast();

  const doFetch = useCallback(async (f, t) => {
    setLoading(true);
    try {
      const params = {};
      if (f) params.from_month = f;
      if (t) params.to_month   = t;
      const res = await getMemberSummaryReport(params);
      setData(res);
      setFetched(true);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load all data on first render
  useEffect(() => { doFetch("", ""); }, []);

  const handleFilter = () => doFetch(from, to);

  const months     = data?.months     || [];
  const members    = data?.members    || [];
  const colTotals  = data?.colTotals  || {};
  const grandTotal = data?.grandTotal || 0;

  const presets = [
    { label: "সকল সময়",   from: "",                               to: ""                 },
    { label: "এই বছর",    from: `${yyyy}-01`,                     to: `${yyyy}-${curMM}` },
    { label: "শেষ ৬ মাস", from: prevMonth(`${yyyy}-${curMM}`, 5), to: `${yyyy}-${curMM}` },
    { label: "গত বছর",    from: `${yyyy - 1}-01`,                 to: `${yyyy - 1}-12`   },
  ];

  const TH = {
    padding: "10px 10px", background: "#0d3528", color: "#fff",
    fontSize: "0.78rem", fontWeight: 700, textAlign: "center",
    border: "1px solid #000", whiteSpace: "nowrap",
  };
  const TD = (extra = {}) => ({
    padding: "8px 10px", fontSize: "0.82rem",
    border: "1px solid #e2ede8", ...extra,
  });

  return (
    <div>
      <style>{PRINT_STYLE}</style>
      <Toast toast={toast} />

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>সার্বিক চাঁদা প্রতিবেদন</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>সকল সদস্যের মাসভিত্তিক চাঁদার পূর্ণ বিবরণী</p>
        </div>
        {fetched && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={{
              padding: "9px 20px", borderRadius: 9, border: "1.5px solid #0d3528",
              background: "transparent", color: "#0d3528",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            }}>🖨️ প্রিন্ট</button>
            <button onClick={() => openPdf({ months, members, colTotals, grandTotal, from, to })} style={{
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: "#0d3528", color: "#fff",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            }}>⬇ PDF</button>
          </div>
        )}
      </div>

      {/* ── Filter panel ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center", marginRight: 4 }}>দ্রুত নির্বাচন:</span>
          {presets.map(p => {
            const active = p.from === from && p.to === to;
            return (
              <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); doFetch(p.from, p.to); }} style={{
                padding: "4px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: active ? "var(--primary)" : "var(--border)",
                background:  active ? "var(--primary)" : "transparent",
                color:       active ? "#fff" : "var(--muted)",
                fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
              }}>{p.label}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <MonthYearSelect label="শুরু মাস" value={from} onChange={setFrom} />
          <div style={{ fontSize: "1.3rem", color: "var(--muted)", paddingBottom: 6 }}>→</div>
          <MonthYearSelect label="শেষ মাস" value={to} onChange={setTo} />
          <button onClick={handleFilter} disabled={loading} style={{
            padding: "9px 26px", borderRadius: 9, border: "none",
            background: "var(--primary)", color: "#fff",
            fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            alignSelf: "flex-end",
          }}>{loading ? "লোড হচ্ছে..." : "প্রদর্শন করুন"}</button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {fetched && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "মোট সদস্য",  val: `${members.length} জন`, color: "var(--primary)" },
            { label: "সক্রিয় মাস", val: `${months.length} মাস`, color: "#8b5cf6"        },
            { label: "মোট সংগ্রহ", val: money(grandTotal),       color: "var(--success)" },
          ].map(c => (
            <div key={c.label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "0.9rem 1.2rem",
            }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: c.color }}>{c.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pivot table ── */}
      {fetched && (
        <div id="pivot-area">
          <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>

            <div className="no-print" style={{ padding: "0.9rem 1.2rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 700, color: "var(--text)" }}>
                সময়কাল: <span style={{ color: "var(--primary)" }}>
                  {from && to ? `${fmtMonth(from)} — ${fmtMonth(to)}` : "সকল সময়"}
                </span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                {members.length} জন সদস্য · {months.length} মাস
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: Math.max(640, 220 + months.length * 110) }}>
                <thead>
                  {/* Print-only org header */}
                  <tr className="org-hdr">
                    <td colSpan={months.length + 3} style={{ border: "1px solid #000", padding: "8px 12px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Noto Serif Bengali',serif", fontSize: "13pt", fontWeight: 800 }}>বারাকাহ মুশারাকাহ ফাউন্ডেশন</div>
                      <div style={{ fontSize: "11pt", fontWeight: 700, marginTop: 2 }}>সার্বিক চাঁদা প্রতিবেদন</div>
                      <div style={{ fontSize: "9pt", marginTop: 2 }}>সময়কাল: {from && to ? `${fmtMonth(from)} — ${fmtMonth(to)}` : "সকল সময়"}</div>
                    </td>
                  </tr>

                  <tr className="th-dark">
                    <th style={{ ...TH, width: 44 }}>ক্র.নং</th>
                    <th style={{ ...TH, textAlign: "left", minWidth: 170 }}>সদস্যের নাম</th>
                    {months.map(mo => (
                      <th key={mo} style={{ ...TH, minWidth: 105 }}>{fmtMonth(mo)}</th>
                    ))}
                    <th style={{ ...TH, minWidth: 115, background: "#164d3a" }}>মোট</th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((m, i) => {
                    const total = +(m.total || 0);
                    const rowBg = i % 2 === 0 ? "#f8fbf9" : "#fff";
                    return (
                      <tr key={m.memberId} style={{ background: rowBg }}>
                        <td style={TD({ textAlign: "center", color: "var(--muted)", fontSize: "0.75rem" })}>{i + 1}</td>
                        <td style={TD({ fontWeight: 600 })}>{m.memberName || "—"}</td>
                        {months.map(mo => {
                          const amt = +(m.monthly?.[mo] || 0);
                          return (
                            <td key={mo} style={TD({ textAlign: "right", fontWeight: amt > 0 ? 700 : 400, color: amt > 0 ? "var(--success)" : "var(--muted)" })}>
                              {amt > 0 ? money(amt) : "—"}
                            </td>
                          );
                        })}
                        <td style={TD({ textAlign: "right", fontWeight: 800, background: "#f0f7f4", color: total > 0 ? "var(--text)" : "var(--muted)" })}>
                          {total > 0 ? money(total) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="tf-dark" style={{ background: "#0d3528", color: "#fff" }}>
                    <td colSpan={2} style={{ padding: "11px 12px", fontWeight: 800, fontSize: "0.9rem", border: "1px solid #000" }}>
                      সর্বমোট
                    </td>
                    {months.map(mo => {
                      const s = +(colTotals[mo] || 0);
                      return (
                        <td key={mo} style={{ padding: "11px 10px", textAlign: "right", fontWeight: 800, fontSize: "0.88rem", border: "1px solid #000" }}>
                          {s > 0 ? money(s) : "—"}
                        </td>
                      );
                    })}
                    <td className="tf-grand" style={{ padding: "11px 12px", textAlign: "right", fontWeight: 900, fontSize: "1rem", border: "1px solid #000", background: "#164d3a" }}>
                      {money(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!fetched && !loading && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--muted)", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>মাস ও বছর নির্বাচন করুন</div>
          <div style={{ fontSize: "0.82rem" }}>তারপর "প্রদর্শন করুন" বাটনে ক্লিক করুন</div>
        </div>
      )}
    </div>
  );
}
