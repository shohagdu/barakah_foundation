import { useState, useEffect, useCallback, useRef } from "react";
import { getMemberWiseReport, getMembers } from "../api.js";
import { Toast, PageHeader, useToast, Loader } from "../components.jsx";

const BN_MONTHS = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
];

function fmtMonth(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-");
  return `${BN_MONTHS[parseInt(m, 10) - 1] || m} ${y}`;
}

function prevMonth(base, n) {
  let [y, m] = base.split("-").map(Number);
  for (let i = 0; i < n; i++) { m--; if (m < 1) { m = 12; y--; } }
  return `${y}-${String(m).padStart(2, "0")}`;
}

const tk = n =>
  `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Separate month + year selects ─────────────────────────────
function MonthYearSelect({ label, value, onChange }) {
  const [selYear, selMonth] = value ? value.split("-") : ["", ""];
  const curYear = new Date().getFullYear();
  const years   = [];
  for (let y = curYear + 1; y >= 2020; y--) years.push(y);

  const sel = {
    border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "8px 10px", fontFamily: "inherit", fontSize: "0.875rem",
    color: "var(--text)", background: "var(--card)", cursor: "pointer",
  };

  const setM = mm => { if (mm && selYear) onChange(`${selYear}-${mm}`); else if (mm) onChange(`${curYear}-${mm}`); };
  const setY = yy => { if (yy && selMonth) onChange(`${yy}-${selMonth}`); else if (yy) onChange(`${yy}-01`); };

  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={selMonth || ""} onChange={e => setM(e.target.value)} style={{ ...sel, minWidth: 130 }}>
          <option value="">— মাস —</option>
          {BN_MONTHS.map((name, i) => (
            <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
          ))}
        </select>
        <select value={selYear || ""} onChange={e => setY(e.target.value)} style={{ ...sel, minWidth: 88 }}>
          <option value="">— বছর —</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Printable report body ─────────────────────────────────────
function ReportBody({ data, from, to }) {
  const { member, deposits, totalPaid, totalUnpaid, collections, totalCollections } = data;
  const grandTotal = (+(totalPaid || 0)) + (+(totalUnpaid || 0));

  return (
    <div id="print-area" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      {/* Org header */}
      <div style={{ textAlign: "center", marginBottom: "1.2rem", borderBottom: "2px solid #1a6b5a", paddingBottom: "0.8rem" }}>
        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0d3528", fontFamily: "'Noto Serif Bengali', serif" }}>
          বারাকাহ মুশারাকাহ ফাউন্ডেশন
        </div>
        <div style={{ fontSize: "0.85rem", color: "#555", marginTop: 2 }}>
          সদস্যের চাঁদার বিবরণী
        </div>
        {(from || to) && (
          <div style={{ fontSize: "0.8rem", color: "#777", marginTop: 2 }}>
            সময়কাল: {fmtMonth(from)} — {fmtMonth(to)}
          </div>
        )}
      </div>

      {/* Member info */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem 1.5rem",
        background: "#f5faf8", border: "1px solid #ddeae4", borderRadius: 8,
        padding: "0.75rem 1.1rem", marginBottom: "1.2rem", fontSize: "0.875rem",
      }}>
        <div>
          <span style={{ color: "#6b8a7e", fontWeight: 600 }}>সদস্যের নাম: </span>
          <strong>{member.name}</strong>
        </div>
        <div>
          <span style={{ color: "#6b8a7e", fontWeight: 600 }}>মোবাইল: </span>
          <strong>{member.phone || "—"}</strong>
        </div>
        <div>
          <span style={{ color: "#6b8a7e", fontWeight: 600 }}>ঠিকানা: </span>
          <strong>{member.address || "—"}</strong>
        </div>
      </div>

      {/* Deposit table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "#0d3528", color: "#fff" }}>
            <th style={TH}>ক্র.নং</th>
            <th style={TH}>নোট</th>
            <th style={{ ...TH, textAlign: "right" }}>চাঁদার পরিমাণ</th>
            <th style={TH}>পরিশোধ তারিখ</th>
            <th style={TH}>রশিদ নং</th>
            <th style={TH}>অবস্থা</th>
          </tr>
        </thead>
        <tbody>
          {deposits.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: "1.5rem", textAlign: "center", color: "#888" }}>
                কোনো চাঁদার তথ্য নেই
              </td>
            </tr>
          ) : (
            deposits.map((d, i) => {
              const paid = d.status === "paid";
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fcfb", borderBottom: "1px solid #e5ede9" }}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{fmtMonth(d.depositMonth)} — মাসিক চাঁদা</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>{tk(d.amount)}</td>
                  <td style={TD}>{d.depositDate || "—"}</td>
                  <td style={TD}>
                    {d.transactionId
                      ? <span style={{ fontFamily: "monospace", fontWeight: 600 }}>#{d.transactionId}</span>
                      : <span style={{ color: "#aaa" }}>—</span>}
                  </td>
                  <td style={TD}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                      background: paid ? "#dcfce7" : "#fee2e2",
                      color: paid ? "#15803d" : "#dc2626",
                    }}>
                      {paid ? "পরিশোধিত" : "বকেয়া"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f0f7f4", borderTop: "2px solid #1a6b5a", fontWeight: 700 }}>
            <td colSpan={2} style={{ ...TD, color: "#555" }}>মোট ({deposits.length} টি)</td>
            <td style={{ ...TD, textAlign: "right", fontSize: "1rem", color: "#0d3528" }}>{tk(grandTotal)}</td>
            <td colSpan={3} style={TD} />
          </tr>
          <tr style={{ background: "#f0f7f4" }}>
            <td colSpan={2} style={{ ...TD, color: "#555" }}>মোট পরিশোধিত</td>
            <td style={{ ...TD, textAlign: "right", color: "#15803d", fontWeight: 700 }}>{tk(totalPaid)}</td>
            <td colSpan={3} style={TD} />
          </tr>
          <tr style={{ background: "#f0f7f4" }}>
            <td colSpan={2} style={{ ...TD, color: "#555" }}>মোট বকেয়া</td>
            <td style={{ ...TD, textAlign: "right", color: "#dc2626", fontWeight: 700 }}>{tk(totalUnpaid)}</td>
            <td colSpan={3} style={TD} />
          </tr>
        </tfoot>
      </table>

      {/* Summary totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#f0f7f4", border: "1.5px solid #1a6b5a", borderRadius: 8, padding: "0.9rem 1rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b8a7e", textTransform: "uppercase", marginBottom: 4 }}>মোট মাসিক জমা</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0d3528" }}>{tk(grandTotal)}</div>
        </div>
        <div style={{ background: "#fef5f0", border: "1.5px solid #c97a3f", borderRadius: 8, padding: "0.9rem 1rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a86d3a", textTransform: "uppercase", marginBottom: 4 }}>মোট বিশেষ সংগ্রহ</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#7c3a1f" }}>{tk(totalCollections || 0)}</div>
        </div>
        <div style={{ background: "#f0f4f8", border: "1.5px solid #2563eb", borderRadius: 8, padding: "0.9rem 1rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5b7a9f", textTransform: "uppercase", marginBottom: 4 }}>সর্বমোট</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e40af" }}>{tk((+(grandTotal || 0)) + (+(totalCollections || 0)))}</div>
        </div>
      </div>

      {/* Special collections section */}
      {collections && collections.length > 0 && (
        <>
          <div style={{ marginTop: "1.5rem", marginBottom: "0.5rem", fontSize: "0.78rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid var(--border)", paddingBottom: 5 }}>
            বিশেষ সংগ্রহ
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#1a6b5a", color: "#fff" }}>
                <th style={TH}>ক্র.নং</th>
                <th style={TH}>তারিখ</th>
                <th style={TH}>উদ্দেশ্য</th>
                <th style={TH}>পদ্ধতি</th>
                <th style={{ ...TH, textAlign: "right" }}>পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fcfb", borderBottom: "1px solid #e5ede9" }}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{c.collectionDate || "—"}</td>
                  <td style={TD}>{c.titleBn || c.title}</td>
                  <td style={TD}>{c.paymentMethod === "bank" ? "ব্যাংক" : c.paymentMethod === "mobile_banking" ? "মোবাইল" : "নগদ"}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 700, color: "#0d3528" }}>{tk(c.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f0f7f4", borderTop: "2px solid #1a6b5a", fontWeight: 700 }}>
                <td colSpan={4} style={{ ...TD, color: "#555" }}>মোট বিশেষ সংগ্রহ</td>
                <td style={{ ...TD, textAlign: "right", fontSize: "1rem", color: "#0d3528" }}>{tk(totalCollections)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* Signature row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3rem", paddingTop: "0.5rem", fontSize: "0.8rem", color: "#555" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #999", width: 160, marginBottom: 4 }} />
          সদস্যের স্বাক্ষর
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #999", width: 160, marginBottom: 4 }} />
          কর্তৃপক্ষের স্বাক্ষর
        </div>
      </div>
    </div>
  );
}

const TH = { padding: "9px 12px", textAlign: "left", fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap" };
const TD = { padding: "8px 12px", verticalAlign: "middle" };

// ── Main page ─────────────────────────────────────────────────
export default function MemberWiseReport() {
  const now    = new Date();
  const yyyy   = now.getFullYear();
  const curMM  = String(now.getMonth() + 1).padStart(2, "0");

  const [members,   setMembers]   = useState([]);
  const [memberId,  setMemberId]  = useState("");
  const [from,      setFrom]      = useState(`${yyyy}-01`);
  const [to,        setTo]        = useState(`${yyyy}-${curMM}`);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [toast, showToast]        = useToast();

  useEffect(() => {
    getMembers().then(setMembers).catch(e => showToast(e.message, "error"));
  }, []);

  const load = useCallback(async () => {
    if (!memberId) return showToast("সদস্য নির্বাচন করুন", "error");
    try {
      setLoading(true);
      setData(await getMemberWiseReport({
        member_id: memberId,
        from_month: from || null,
        to_month:   to   || null,
      }));
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [memberId, from, to]);

  const handlePrint = () => window.print();

  const presets = [
    { label: "এই বছর",    from: `${yyyy}-01`,                     to: `${yyyy}-${curMM}` },
    { label: "শেষ ৬ মাস", from: prevMonth(`${yyyy}-${curMM}`, 5), to: `${yyyy}-${curMM}` },
    { label: "গত বছর",    from: `${yyyy - 1}-01`,                 to: `${yyyy - 1}-12`   },
  ];

  const sel = {
    border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "8px 12px", fontFamily: "inherit", fontSize: "0.875rem",
    color: "var(--text)", background: "var(--card)", cursor: "pointer", width: "100%",
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; }
          @page { margin: 15mm; }
        }
      `}</style>

      <Toast toast={toast} />
      <PageHeader title="সদস্যভিত্তিক চাঁদার রিপোর্ট">
        {data && (
          <button onClick={handlePrint} style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: "#0d3528", color: "#fff",
            fontFamily: "inherit", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
          }}>
            🖨️ প্রিন্ট
          </button>
        )}
      </PageHeader>

      {/* Filter card */}
      <div className="no-print" style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "1.1rem 1.25rem", marginBottom: "1.5rem",
      }}>
        {/* Quick presets */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", alignSelf: "center" }}>
            দ্রুত নির্বাচন:
          </span>
          {presets.map(p => {
            const active = p.from === from && p.to === to;
            return (
              <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }} style={{
                padding: "4px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: active ? "var(--primary)" : "var(--border)",
                background: active ? "var(--primary)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
              }}>{p.label}</button>
            );
          })}
        </div>

        {/* Selects row */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Member */}
          <div style={{ flex: "1 1 220px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              সদস্য নির্বাচন
            </div>
            <select value={memberId} onChange={e => setMemberId(e.target.value)} style={sel}>
              <option value="">— সদস্য নির্বাচন করুন —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} {m.phone ? `(${m.phone})` : ""}</option>
              ))}
            </select>
          </div>

          {/* From */}
          <MonthYearSelect label="শুরু মাস — বছর" value={from} onChange={setFrom} />

          <div style={{ fontSize: "1.3rem", color: "var(--muted)", paddingBottom: 6 }}>→</div>

          {/* To */}
          <MonthYearSelect label="শেষ মাস — বছর" value={to} onChange={setTo} />

          <button
            onClick={load}
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
      </div>

      {loading && <Loader />}

      {/* Report output */}
      {!loading && data && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "1.5rem 2rem",
        }}>
          <ReportBody data={data} from={from} to={to} />
        </div>
      )}

      {!loading && !data && (
        <div style={{
          textAlign: "center", padding: "3rem",
          color: "var(--muted)", background: "var(--card)",
          borderRadius: 12, border: "1px dashed var(--border)",
        }}>
          সদস্য ও সময়কাল নির্বাচন করে "প্রদর্শন করুন" ক্লিক করুন
        </div>
      )}
    </>
  );
}
