import { useState, useEffect } from "react";
import { getDashboard } from "../api.js";
import { StatCard, Loader, fmtDate, fmtMoney, Badge } from "../components.jsx";

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getDashboard()
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Loader />;
  if (error)   return (
    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "1.5rem", color: "var(--danger)" }}>
      <strong>সংযোগ ব্যর্থ হয়েছে</strong>
      <p style={{ margin: "8px 0 0", fontSize: "0.875rem" }}>Rust backend চালু আছে কিনা চেক করুন: <code>http://127.0.0.1:8080/api/health</code></p>
      <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>{error}</p>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 800, color: "var(--text)" }}>ড্যাশবোর্ড</h2>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="মোট সদস্য"      value={stats.totalMembers}             icon="members"     color="var(--primary)"  sub={`${stats.activeMembers} সক্রিয়`} />
        <StatCard label="মোট আয়"         value={fmtMoney(stats.income)}         icon="money_in"    color="var(--success)" />
        <StatCard label="মোট ব্যয়"        value={fmtMoney(stats.expense)}        icon="money_out"   color="var(--danger)" />
        <StatCard label="নিট ব্যালেন্স"   value={fmtMoney(stats.balance)}        icon="accounts"    color="var(--gold)"    sub={stats.balance >= 0 ? "উদ্বৃত্ত" : "ঘাটতি"} />
        <StatCard label="মোট দান"         value={fmtMoney(stats.totalDonations)} icon="donations"   color="#8b5cf6" />
        <StatCard label="সক্রিয় প্রকল্প" value={stats.activeProjects}           icon="projects"    color="#f59e0b"         sub={`${stats.totalProjects} মোট`} />
        <StatCard label="উপকারভোগী"      value={stats.totalBenef}               icon="beneficiary" color="#10b981" />
        <StatCard label="মিটিং"           value={stats.totalMeetings}            icon="meetings"    color="#ef4444" />
      </div>

      {/* Bottom panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* Recent Transactions */}
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "1.25rem", border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>সাম্প্রতিক লেনদেন</h3>
          {!stats.recentTx?.length
            ? <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>কোনো লেনদেন নেই</p>
            : stats.recentTx.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{t.description}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{fmtDate(t.date)} · {t.category || "—"}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: t.txType === "income" ? "var(--success)" : "var(--danger)" }}>
                  {t.txType === "income" ? "+" : "-"}{fmtMoney(t.amount)}
                </span>
              </div>
            ))
          }
        </div>

        {/* Financial Summary */}
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "1.25rem", border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>আর্থিক সারসংক্ষেপ</h3>
          {[
            { l: "মোট আয়",           v: stats.income,         c: "var(--success)" },
            { l: "মোট ব্যয়",          v: stats.expense,        c: "var(--danger)"  },
            { l: "নিট ব্যালেন্স",     v: stats.balance,        c: "var(--gold)"    },
            { l: "মোট দান সংগ্রহ",   v: stats.totalDonations, c: "#8b5cf6"        },
          ].map(row => (
            <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>{row.l}</span>
              <span style={{ fontWeight: 700, color: row.c, fontSize: "0.95rem" }}>{fmtMoney(row.v)}</span>
            </div>
          ))}

          <div style={{ marginTop: "1rem", padding: "12px", background: "var(--bg)", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>ব্যাকএন্ড</span>
            <Badge color="var(--success)">Rust · Actix-Web</Badge>
          </div>
        </div>

      </div>
    </div>
  );
}
