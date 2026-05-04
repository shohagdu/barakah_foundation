import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getReportProfitLoss, getReportCashFlow, getReportBalanceSheet, getReportTrialBalance,
} from "../api.js";
import {
  Btn, Badge, Toast, PageHeader, useToast, Loader,
} from "../components.jsx";

const tk  = n => `৳${(+(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = n => `${(+(n || 0)).toFixed(1)}%`;

function SCard({ label, value, color = "var(--primary)" }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderLeft: `4px solid ${color}`, borderRadius: 12,
      padding: "1rem 1.25rem", flex: "1 1 160px",
    }}>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function DateFilter({ from, to, onFrom, onTo, onFetch, loading }) {
  const inp = {
    border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px",
    fontFamily: "inherit", fontSize: "0.85rem", color: "var(--text)", background: "var(--card)",
  };
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1.25rem" }}>
      <div>
        <div style={{ fontSize: "0.73rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>শুরু তারিখ</div>
        <input type="date" value={from} onChange={e => onFrom(e.target.value)} style={inp} />
      </div>
      <div>
        <div style={{ fontSize: "0.73rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>শেষ তারিখ</div>
        <input type="date" value={to} onChange={e => onTo(e.target.value)} style={inp} />
      </div>
      <Btn onClick={onFetch} loading={loading}>ফিল্টার করুন</Btn>
    </div>
  );
}

function RTable({ cols, rows, loading, footer }) {
  if (loading) return <Loader />;
  return (
    <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--bg)" }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: "10px 14px", textAlign: c.right ? "right" : "left",
                fontWeight: 700, color: "var(--muted)", fontSize: "0.7rem",
                textTransform: "uppercase", letterSpacing: "0.06em",
                borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows || rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>কোনো তথ্য নেই</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 ? "var(--bg)" : "var(--card)" }}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: "9px 14px", textAlign: c.right ? "right" : "left" }}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
        {footer && (
          <tfoot>
            <tr style={{ background: "var(--bg)", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
              {footer}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

const tdF = (v, right, color) => (
  <td style={{ padding: "9px 14px", textAlign: right ? "right" : "left", color }}>{v}</td>
);

// ── Profit & Loss ─────────────────────────────────────────────
function ProfitLoss() {
  const [data, setData]       = useState(null);
  const [from, setFrom]       = useState("");
  const [to,   setTo]         = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, showToast]    = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setData(await getReportProfitLoss(from || null, to || null)); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const incCols = [
    { key: "accountCode", label: "কোড" },
    { key: "accountName", label: "বিভাগ" },
    { key: "amount",      label: "পরিমাণ",  right: true, render: r => tk(r.amount) },
    { key: "percentage",  label: "%",       right: true, render: r => pct(r.percentage) },
  ];

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="লাভ-ক্ষতি বিবরণী" />
      <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onFetch={load} loading={loading} />

      {loading && !data && <Loader />}
      {data && <>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <SCard label="মোট আয়"  value={tk(data.totalIncome)}  color="var(--success)" />
          <SCard label="মোট ব্যয়" value={tk(data.totalExpense)} color="var(--danger)" />
          <SCard label="নিট লাভ"  value={tk(data.netProfit)}    color={data.netProfit >= 0 ? "var(--primary)" : "var(--danger)"} />
        </div>

        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem", color: "var(--text)" }}>আয়ের বিবরণ</h3>
        <RTable loading={false} rows={data.income || []} cols={incCols}
          footer={<>
            {tdF("মোট আয়", false)} {tdF("", false)}
            {tdF(tk(data.totalIncome), true, "var(--success)")} {tdF("১০০%", true)}
          </>}
        />

        <h3 style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.6rem", marginTop: "1.5rem", color: "var(--text)" }}>ব্যয়ের বিবরণ</h3>
        <RTable loading={false} rows={data.expense || []} cols={incCols}
          footer={<>
            {tdF("মোট ব্যয়", false)} {tdF("", false)}
            {tdF(tk(data.totalExpense), true, "var(--danger)")} {tdF("১০০%", true)}
          </>}
        />

        <div style={{
          marginTop: "1.25rem", background: "var(--card)",
          border: "2px solid var(--primary)", borderRadius: 12,
          padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>নিট লাভ / ক্ষতি</span>
          <span style={{ fontWeight: 800, fontSize: "1.3rem", color: data.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>{tk(data.netProfit)}</span>
        </div>
      </>}
    </div>
  );
}

// ── Cash Flow ─────────────────────────────────────────────────
function CashFlow() {
  const [rows, setRows]       = useState([]);
  const [from, setFrom]       = useState("");
  const [to,   setTo]         = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, showToast]    = useToast();

  const load = useCallback(async () => {
    try { setLoading(true); setRows(await getReportCashFlow(from || null, to || null)); }
    catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, []);

  const totalInflow  = rows.reduce((s, r) => s + (+(r.inflow  || 0)), 0);
  const totalOutflow = rows.reduce((s, r) => s + (+(r.outflow || 0)), 0);

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="নগদ প্রবাহ বিবরণী" />
      <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} onFetch={load} loading={loading} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <SCard label="মোট আগমন"    value={tk(totalInflow)}                color="var(--success)" />
        <SCard label="মোট বহির্গমন" value={tk(totalOutflow)}              color="var(--danger)" />
        <SCard label="নিট প্রবাহ"   value={tk(totalInflow - totalOutflow)} color="var(--primary)" />
      </div>

      <RTable
        loading={loading}
        rows={rows}
        cols={[
          { key: "date",           label: "তারিখ" },
          { key: "description",    label: "বিবরণ" },
          { key: "reference",      label: "রেফারেন্স" },
          { key: "inflow",         label: "আগমন",          right: true, render: r => r.inflow  ? tk(r.inflow)  : "—" },
          { key: "outflow",        label: "বহির্গমন",      right: true, render: r => r.outflow ? tk(r.outflow) : "—" },
          { key: "runningBalance", label: "চলতি ব্যালেন্স", right: true, render: r => (
            <span style={{ fontWeight: 700, color: (r.runningBalance ?? 0) >= 0 ? "var(--primary)" : "var(--danger)" }}>
              {tk(r.runningBalance)}
            </span>
          )},
        ]}
        footer={<>
          {tdF("মোট", false)} {tdF("", false)} {tdF("", false)}
          {tdF(tk(totalInflow),  true, "var(--success)")}
          {tdF(tk(totalOutflow), true, "var(--danger)")}
          {tdF(tk(totalInflow - totalOutflow), true, "var(--primary)")}
        </>}
      />
    </div>
  );
}

// ── Balance Sheet ─────────────────────────────────────────────
function BalanceSheet() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, showToast]    = useToast();

  useEffect(() => {
    getReportBalanceSheet()
      .then(setData)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><Toast toast={toast} /><Loader /></>;

  const bsCols = [
    { key: "accountCode", label: "কোড" },
    { key: "category",    label: "বিভাগ" },
    { key: "balance",     label: "ব্যালেন্স", right: true, render: r => tk(r.balance) },
  ];

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="ব্যালেন্স শিট" />
      {data && <>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <SCard label="মোট সম্পদ"       value={tk(data.totalAssets)}            color="var(--primary)" />
          <SCard label="মোট দায় + মূলধন" value={tk(data.totalLiabilitiesEquity)} color="var(--gold)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "0.6rem" }}>সম্পদ (Assets)</h3>
            <RTable loading={false} rows={data.assets || []} cols={bsCols}
              footer={<>
                {tdF("মোট সম্পদ", false)} {tdF("", false)} {tdF(tk(data.totalAssets), true, "var(--primary)")}
              </>}
            />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: "0.6rem" }}>দায় (Liabilities)</h3>
            <RTable loading={false} rows={data.liabilities || []} cols={bsCols} />
            <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", margin: "1rem 0 0.6rem" }}>মূলধন (Equity)</h3>
            <RTable loading={false} rows={data.equity || []} cols={bsCols}
              footer={<>
                {tdF("মোট দায় + মূলধন", false)} {tdF("", false)} {tdF(tk(data.totalLiabilitiesEquity), true, "var(--gold)")}
              </>}
            />
          </div>
        </div>
      </>}
    </div>
  );
}

// ── Trial Balance ─────────────────────────────────────────────
function TrialBalance() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, showToast]    = useToast();

  useEffect(() => {
    getReportTrialBalance()
      .then(setRows)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const totalDebit  = rows.reduce((s, r) => s + (+(r.totalDebit  || 0)), 0);
  const totalCredit = rows.reduce((s, r) => s + (+(r.totalCredit || 0)), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  const TYPE_LABEL = { asset: "সম্পদ", liability: "দায়", equity: "মূলধন", income: "আয়", expense: "ব্যয়" };
  const TYPE_COLOR = { asset: "var(--primary)", liability: "var(--gold)", equity: "#8b5cf6", income: "var(--success)", expense: "var(--danger)" };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="ট্রায়াল ব্যালেন্স" />
      <RTable
        loading={loading}
        rows={rows}
        cols={[
          { key: "accountCode", label: "কোড" },
          { key: "accountName", label: "নাম" },
          { key: "type",        label: "ধরন", render: r => <Badge color={TYPE_COLOR[r.type] || "var(--primary)"}>{TYPE_LABEL[r.type] || r.type}</Badge> },
          { key: "totalDebit",  label: "ডেবিট",    right: true, render: r => tk(r.totalDebit) },
          { key: "totalCredit", label: "ক্রেডিট",   right: true, render: r => tk(r.totalCredit) },
          { key: "balance",     label: "ব্যালেন্স",  right: true, render: r => (
            <span style={{ fontWeight: 700, color: (+(r.balance || 0)) >= 0 ? "var(--primary)" : "var(--danger)" }}>
              {tk(r.balance)}
            </span>
          )},
        ]}
        footer={<>
          {tdF("মোট", false)} {tdF("", false)} {tdF("", false)}
          {tdF(tk(totalDebit),  true, "inherit")}
          {tdF(tk(totalCredit), true, "inherit")}
          {tdF(balanced ? "✓ সমন্বিত" : tk(totalDebit - totalCredit), true, balanced ? "var(--success)" : "var(--danger)")}
        </>}
      />
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────
const TABS = [
  { path: "/reports/profit-loss",   label: "লাভ-ক্ষতি" },
  { path: "/reports/cash-flow",     label: "নগদ প্রবাহ" },
  { path: "/reports/balance-sheet", label: "ব্যালেন্স শিট" },
  { path: "/reports/trial-balance", label: "ট্রায়াল ব্যালেন্স" },
];

// ── Reports Layout ────────────────────────────────────────────
export default function Reports() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  useEffect(() => {
    if (path === "/reports" || path === "/reports/")
      navigate("/reports/profit-loss", { replace: true });
  }, [path]);

  return (
    <div>
      <div style={{
        display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap",
        borderBottom: "2px solid var(--border)", marginBottom: "1.75rem",
      }}>
        {TABS.map(t => {
          const active = path === t.path;
          return (
            <button key={t.path} onClick={() => navigate(t.path)} style={{
              padding: "7px 18px", border: "none",
              borderRadius: "8px 8px 0 0", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem",
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2, transition: "all .15s",
            }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {path === "/reports/profit-loss"   && <ProfitLoss />}
      {path === "/reports/cash-flow"     && <CashFlow />}
      {path === "/reports/balance-sheet" && <BalanceSheet />}
      {path === "/reports/trial-balance" && <TrialBalance />}
    </div>
  );
}
