import { useState, useEffect } from "react";
import { getExpenseReportSummary, getExpenseCategories } from "../api.js";
import { Toast, useToast } from "../components.jsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const fmtMoney = n => "৳" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const today = () => new Date().toISOString().split("T")[0];
const monthsAgo = n => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
};

const COLORS = ["#1a6b5a","#c49a1a","#3b82f6","#dc2626","#7c3aed","#059669","#ea580c","#0284c7"];

const BN_MONTHS = ["","জান","ফেব","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ","অক্ট","নভ","ডিস"];
const fmtMonthLabel = ym => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${BN_MONTHS[parseInt(m, 10)] || m} ${y?.slice(2)}`;
};

const GROUP_OPTIONS = [
  { value: "category",       label: "ক্যাটাগরি অনুযায়ী" },
  { value: "month",          label: "মাস অনুযায়ী" },
  { value: "payment_method", label: "পরিশোধ পদ্ধতি অনুযায়ী" },
];

const PM_LABEL = { cash: "নগদ", bank: "ব্যাংক", mobile_banking: "মোবাইল ব্যাংকিং" };

export default function ExpenseReport() {
  const [from,     setFrom]    = useState(monthsAgo(11));
  const [to,       setTo]      = useState(today());
  const [groupBy,  setGroupBy] = useState("category");
  const [data,     setData]    = useState({ grouped: [], trend: [] });
  const [loading,  setLoading] = useState(false);
  const [toast,    showToast]  = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getExpenseReportSummary({ from, to, group_by: groupBy });
      setData(res);
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to, groupBy]);

  const grouped   = data.grouped || [];
  const trend     = data.trend   || [];

  const totalAll  = grouped.reduce((s, r) => s + Number(r.total || 0), 0);
  const topCat    = grouped[0];
  const avgMonth  = trend.length ? totalAll / trend.length : 0;

  const chartData = grouped.map((r, i) => ({
    name:  PM_LABEL[r.grpKey] || r.grpKey || "—",
    total: Number(r.total || 0),
    count: r.count,
    fill:  COLORS[i % COLORS.length],
  }));

  const trendData = trend.map(r => ({
    month: fmtMonthLabel(r.month),
    total: Number(r.total || 0),
  }));

  const inp = {
    border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 10px",
    fontFamily: "inherit", fontSize: "0.875rem", color: "var(--text)", background: "var(--card)",
  };
  const lbl = { fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" };
  const card = { background: "var(--card)", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid var(--border)" };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: "var(--danger)", fontWeight: 800 }}>{fmtMoney(payload[0]?.value)}</div>
      </div>
    );
  };

  return (
    <div>
      <Toast toast={toast} />

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>খরচের রিপোর্ট</h2>
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: "1.2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={lbl}>শুরুর তারিখ</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>শেষ তারিখ</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>গ্রুপ করুন</label>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={inp}>
            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "মোট খরচ",       val: fmtMoney(totalAll),      color: "var(--danger)" },
          { label: "সর্বোচ্চ ক্যাটাগরি", val: topCat?.name || "—",  color: "var(--primary)" },
          { label: "প্রতি মাস গড়",  val: fmtMoney(avgMonth),      color: "var(--gold)" },
        ].map(c => (
          <div key={c.label} style={card}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>লোড হচ্ছে...</div>
      ) : (
        <>
          {/* Bar Chart + Pie */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: "1rem" }}>ক্যাটাগরি / গ্রুপ অনুযায়ী খরচ</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => "৳" + (v/1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" radius={[4,4,0,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: "1rem" }}>অনুপাত</div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={chartData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "0.75rem" }} />
                    <Tooltip formatter={v => fmtMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ color: "var(--muted)", textAlign: "center", paddingTop: "4rem" }}>কোনো ডেটা নেই</div>}
            </div>
          </div>

          {/* Line Chart */}
          {trendData.length > 0 && (
            <div style={{ ...card, marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "1rem" }}>মাসিক প্রবণতা (শেষ ১২ মাস)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => "৳" + (v/1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="total" stroke="var(--danger)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail Table */}
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: "1rem" }}>বিস্তারিত তালিকা</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["গ্রুপ", "মোট পরিমাণ", "সংখ্যা", "গড়"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: r.fill, marginRight: 8 }} />
                      {r.name}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--danger)" }}>{fmtMoney(r.total)}</td>
                    <td style={{ padding: "10px 12px" }}>{r.count}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{fmtMoney(r.total / (r.count || 1))}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 800 }}>
                  <td style={{ padding: "10px 12px" }}>মোট</td>
                  <td style={{ padding: "10px 12px", color: "var(--danger)" }}>{fmtMoney(totalAll)}</td>
                  <td style={{ padding: "10px 12px" }}>{grouped.reduce((s,r) => s + Number(r.count||0), 0)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
