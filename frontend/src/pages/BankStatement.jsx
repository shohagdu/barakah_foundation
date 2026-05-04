import { useState, useEffect } from "react";
import { getBankStatement, getSettingsBanks } from "../api.js";
import { Toast, PageHeader, useToast, Loader } from "../components.jsx";

const tk = n =>
  `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = d => {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10).split("-").reverse().join("-");
};

const today      = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 7) + "-01";

// ── Summary card ──────────────────────────────────────────────
function SumCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1.2rem", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

// ── PDF ───────────────────────────────────────────────────────
function generatePDF({ data, bank, fromDate, toDate }) {
  const { openingBalance, totalDebit, totalCredit, closingBalance, rows } = data;
  const fmtD = d => d ? new Date(d).toISOString().slice(0,10).split("-").reverse().join("-") : "—";

  const bankHeader = bank
    ? `<p><strong>${bank.bankName || ""}</strong> &nbsp;|&nbsp; একাউন্ট: ${bank.accountNumber || "—"} &nbsp;|&nbsp; নাম: ${bank.accountName || "—"}${bank.branchName ? ` &nbsp;|&nbsp; শাখা: ${bank.branchName}` : ""}</p>`
    : `<p>সকল ব্যাংক একাউন্ট</p>`;

  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmtD(r.txnDate)}</td>
      <td>${r.description || "—"}</td>
      <td>${r.reference || "—"}</td>
      <td class="num">${r.debit > 0 ? tk(r.debit) : "—"}</td>
      <td class="num">${r.credit > 0 ? tk(r.credit) : "—"}</td>
      <td class="num bal">${tk(r.balance)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Bank Statement</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Hind Siliguri',sans-serif;font-size:11px;color:#1a2e28}
  @page{size:A4 portrait;margin:12mm 10mm 20mm 10mm;@bottom-right{content:"পৃষ্ঠা " counter(page) " / " counter(pages);font-size:9px;color:#888}}
  .hdr{text-align:center;margin-bottom:10px;border-bottom:2px solid #1a6b5a;padding-bottom:8px}
  .hdr h1{font-size:16px;color:#1a6b5a;font-weight:800}
  .hdr h2{font-size:13px;color:#333;font-weight:700;margin-top:2px}
  .hdr p{font-size:10px;color:#555;margin-top:3px}
  .bank-box{background:#f0f9f5;border:1px solid #b6d9cc;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:10px}
  .bank-box strong{color:#1a6b5a}
  .period{font-size:10px;color:#555;margin-bottom:10px;text-align:right}
  .summary{display:flex;gap:10px;margin-bottom:10px}
  .sc{flex:1;border:1px solid #ddeae4;border-radius:6px;padding:7px 10px}
  .sc .lbl{font-size:8.5px;color:#888;font-weight:600;margin-bottom:2px}
  .sc .val{font-size:13px;font-weight:800}
  .open .val{color:#1a6b5a}.din .val{color:#2563eb}.dout .val{color:#dc2626}.close .val{color:#7c3aed}
  table{width:100%;border-collapse:collapse}
  thead th{background:#1a6b5a;color:#fff;font-size:10px;font-weight:700;padding:6px;text-align:left}
  thead th.num{text-align:right}
  tbody tr:nth-child(even){background:#f8fbf9}
  tbody td{padding:5px 6px;font-size:10px;border-bottom:1px solid #eef3f1}
  .num{text-align:right}.bal{font-weight:700;color:#1a6b5a}
  tfoot td{font-size:10px;font-weight:800;background:#0d3528;color:#fff;padding:6px}
  tfoot .num{text-align:right}
</style></head>
<body>
<div class="hdr">
  <h1>বারাকাহ মুশারাকাহ ফাউন্ডেশন</h1>
  <h2>ব্যাংক স্টেটমেন্ট</h2>
  <p>সময়কাল: ${fmtD(fromDate)} — ${fmtD(toDate)}</p>
</div>
${bank ? `<div class="bank-box">
  <strong>${bank.bankName || ""}</strong> &nbsp;|&nbsp;
  একাউন্ট নম্বর: ${bank.accountNumber || "—"} &nbsp;|&nbsp;
  একাউন্ট নাম: ${bank.accountName || "—"}
  ${bank.branchName ? `&nbsp;|&nbsp; শাখা: ${bank.branchName}` : ""}
</div>` : `<div class="bank-box"><strong>সকল ব্যাংক একাউন্ট</strong></div>`}
<div class="summary">
  <div class="sc open"><div class="lbl">প্রারম্ভিক ব্যালেন্স</div><div class="val">${tk(openingBalance)}</div></div>
  <div class="sc din"><div class="lbl">মোট জমা (IN)</div><div class="val">${tk(totalDebit)}</div></div>
  <div class="sc dout"><div class="lbl">মোট উত্তোলন (OUT)</div><div class="val">${tk(totalCredit)}</div></div>
  <div class="sc close"><div class="lbl">সমাপনী ব্যালেন্স</div><div class="val">${tk(closingBalance)}</div></div>
</div>
<table>
<thead>
  <tr>
    <th style="width:30px">ক্র.</th><th>তারিখ</th><th>বিবরণ</th><th>রেফারেন্স</th>
    <th class="num">জমা (IN)</th><th class="num">উত্তোলন (OUT)</th><th class="num">ব্যালেন্স</th>
  </tr>
</thead>
<tbody>
  <tr><td></td><td colspan="5"><strong>প্রারম্ভিক ব্যালেন্স</strong></td><td class="num bal">${tk(openingBalance)}</td></tr>
  ${rowsHtml}
</tbody>
<tfoot>
  <tr><td colspan="4">সর্বমোট</td><td class="num">${tk(totalDebit)}</td><td class="num">${tk(totalCredit)}</td><td class="num">${tk(closingBalance)}</td></tr>
</tfoot>
</table>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("পপ-আপ ব্লক করা আছে।"); return; }
  win.document.write(html);
  win.document.close();
}

// ── Date input ────────────────────────────────────────────────
function DateInput({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "inherit", background: "#fff", color: "var(--text)" }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function BankStatement() {
  const [toast, showToast] = useToast();

  const [banks,   setBanks]   = useState([]);
  const [bankId,  setBankId]  = useState("");
  const [from,    setFrom]    = useState(monthStart());
  const [to,      setTo]      = useState(today());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSettingsBanks().then(r => setBanks(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = { from, to };
      if (bankId) params.bank_account_id = bankId;
      setData(await getBankStatement(params));
    } catch {
      showToast("ডেটা লোড হয়নি", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedBank = bankId ? banks.find(b => String(b.id) === String(bankId)) : null;
  const rows = data?.rows || [];

  return (
    <div style={{ animation: "slideUp .25s ease" }}>
      <Toast toast={toast} />

      <PageHeader title="ব্যাংক স্টেটমেন্ট">
        {data && rows.length > 0 && (
          <button onClick={() => generatePDF({ data, bank: selectedBank, fromDate: from, toDate: to })}
            style={{ padding: "9px 18px", background: "#1a6b5a", color: "#fff", border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
            📄 PDF ডাউনলোড
          </button>
        )}
      </PageHeader>

      {/* ── Filters ─────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "1.2rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>ব্যাংক একাউন্ট</label>
          <select value={bankId} onChange={e => setBankId(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "inherit", background: "#fff" }}>
            <option value="">সকল ব্যাংক</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>
            ))}
          </select>
        </div>
        <DateInput label="শুরুর তারিখ" value={from} onChange={setFrom} />
        <DateInput label="শেষ তারিখ"   value={to}   onChange={setTo}   />
        <button onClick={load} disabled={loading}
          style={{ padding: "9px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem", alignSelf: "flex-end" }}>
          {loading ? "লোড হচ্ছে…" : "দেখুন"}
        </button>
      </div>

      {/* ── Selected bank info card ───────────────────── */}
      {selectedBank && (
        <div style={{ background: "#f0f9f5", border: "1px solid #b6d9cc", borderRadius: 10, padding: "0.85rem 1.2rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1.2rem" }}>
          <InfoItem label="ব্যাংকের নাম"       value={selectedBank.bankName}      />
          <InfoItem label="একাউন্ট নম্বর"      value={selectedBank.accountNumber} />
          <InfoItem label="একাউন্ট নাম"        value={selectedBank.accountName}   />
          {selectedBank.branchName    && <InfoItem label="শাখা"         value={selectedBank.branchName}    />}
          {selectedBank.routingNumber && <InfoItem label="রাউটিং নম্বর" value={selectedBank.routingNumber} />}
          <InfoItem label="সময়কাল" value={`${fmtDate(from)} — ${fmtDate(to)}`} />
        </div>
      )}

      {loading && <Loader />}

      {!loading && data && (
        <>
          {/* ── Summary cards ─────────────────────────── */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: "1.2rem" }}>
            <SumCard label="প্রারম্ভিক ব্যালেন্স" value={tk(data.openingBalance)} color="var(--primary)" />
            <SumCard label="মোট জমা (IN)"          value={tk(data.totalDebit)}    color="#2563eb" />
            <SumCard label="মোট উত্তোলন (OUT)"     value={tk(data.totalCredit)}   color="var(--danger)" />
            <SumCard label="সমাপনী ব্যালেন্স"       value={tk(data.closingBalance)} color="#7c3aed" />
          </div>

          {/* ── Table ─────────────────────────────────── */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1a6b5a" }}>
                  {["ক্র.", "তারিখ", "বিবরণ", "রেফারেন্স", "জমা (IN)", "উত্তোলন (OUT)", "ব্যালেন্স"].map((h, i) => (
                    <th key={i} style={{ padding: "11px 12px", color: "#fff", fontSize: "0.78rem", fontWeight: 700, textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f0f9f5" }}>
                  <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}></td>
                  <td colSpan={5} style={{ padding: "9px 12px", fontSize: "0.82rem", fontWeight: 700, color: "var(--primary)" }}>প্রারম্ভিক ব্যালেন্স</td>
                  <td style={{ padding: "9px 12px", fontSize: "0.82rem", fontWeight: 800, color: "var(--primary)", textAlign: "right" }}>{tk(data.openingBalance)}</td>
                </tr>

                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>নির্বাচিত ফিল্টারে কোনো লেনদেন পাওয়া যায়নি</td></tr>
                )}

                {rows.map((r, i) => (
                  <tr key={r.transactionId} style={{ background: i % 2 === 0 ? "#fff" : "#f8fbf9", borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", color: "var(--muted)" }}>{i + 1}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{fmtDate(r.txnDate)}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>{r.description || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", color: "var(--muted)" }}>{r.reference || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", textAlign: "right", color: "#2563eb", fontWeight: r.debit > 0 ? 700 : 400 }}>
                      {r.debit > 0 ? tk(r.debit) : "—"}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", textAlign: "right", color: "var(--danger)", fontWeight: r.credit > 0 ? 700 : 400 }}>
                      {r.credit > 0 ? tk(r.credit) : "—"}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem", textAlign: "right", fontWeight: 800, color: r.balance >= 0 ? "var(--primary)" : "var(--danger)" }}>
                      {tk(r.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#0d3528" }}>
                    <td colSpan={4} style={{ padding: "10px 12px", color: "#fff", fontWeight: 800, fontSize: "0.85rem" }}>সর্বমোট</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#93c5fd", fontWeight: 800, fontSize: "0.85rem" }}>{tk(data.totalDebit)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#fca5a5", fontWeight: 800, fontSize: "0.85rem" }}>{tk(data.totalCredit)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#6ee7b7", fontWeight: 800, fontSize: "0.85rem" }}>{tk(data.closingBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginTop: 1 }}>{value || "—"}</div>
    </div>
  );
}
