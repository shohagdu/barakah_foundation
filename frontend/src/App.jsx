import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./components.jsx";
import { getStoredUser, clearAuth, isLoggedIn, ROLES } from "./auth.js";

import Login        from "./pages/Login.jsx";
import Dashboard    from "./pages/Dashboard.jsx";
import Members      from "./pages/Members.jsx";
import MemberForm   from "./pages/MemberForm.jsx";
import MemberDetail from "./pages/MemberDetail.jsx";
import Settings     from "./pages/Settings.jsx";
import Reports          from "./pages/Reports.jsx";
import MemberReport     from "./pages/MemberReport.jsx";
import MemberWiseReport    from "./pages/MemberWiseReport.jsx";
import MemberSummaryReport from "./pages/MemberSummaryReport.jsx";
import BankStatement        from "./pages/BankStatement.jsx";
import Collections          from "./pages/Collections.jsx";
import Expenses            from "./pages/Expenses.jsx";
import ExpenseForm         from "./pages/ExpenseForm.jsx";
import ExpenseReport       from "./pages/ExpenseReport.jsx";
import Accounts     from "./pages/Accounts.jsx";
import Users        from "./pages/Users.jsx";
import { Donations, Projects, Beneficiaries, Meetings } from "./pages/Modules.jsx";

// ── NAV CONFIG ─────────────────────────────────────────────
const NAV = [
  { path: "/dashboard",          label: "ড্যাশবোর্ড",      icon: "dashboard", roles: ["admin","accountant","member","viewer"] },
  { path: "/members",            label: "সদস্য",            icon: "members",   roles: ["admin","accountant"] },
  { path: "/accounts",            label: "হিসাব",             icon: "accounts",  roles: ["admin","accountant"] },
  { path: "/collections",         label: "বিশেষ সংগ্রহ",     icon: "money_in",  roles: ["admin","accountant"] },
  { path: "/projects",           label: "প্রকল্প",           icon: "projects",  roles: ["admin","accountant","viewer"] },
  { path: "/meetings",           label: "মিটিং",             icon: "meetings",  roles: ["admin","accountant","viewer"] },
  // ── Reports
  { divider: "রিপোর্ট", roles: ["admin","accountant","member"] },
  { path: "/reports",            label: "হিসাব রিপোর্ট",    icon: "reports",   roles: ["admin","accountant","member"] },
  { path: "/member-report",      label: "সদস্য রিপোর্ট",    icon: "members",   roles: ["admin","accountant","member"] },
  { path: "/member-wise-report",    label: "সদস্য রশিদ",         icon: "reports",   roles: ["admin","accountant","member"] },
  { path: "/member-summary-report", label: "চাঁদা সারসংক্ষেপ",  icon: "reports",   roles: ["admin","accountant","member"] },
  { path: "/reports/expenses",        label: "খরচ রিপোর্ট",        icon: "expense",   roles: ["admin","accountant","member"] },
  { path: "/reports/bank-statement",  label: "ব্যাংক স্টেটমেন্ট",  icon: "accounts",  roles: ["admin","accountant","member"] },
  // ── Expense
  { divider: "ব্যয় ব্যবস্থাপনা", roles: ["admin","accountant"] },
  { path: "/expenses",           label: "খরচের তালিকা",     icon: "expense",   roles: ["admin","accountant"] },
  // ── Admin
  { divider: "প্রশাসন", roles: ["admin"] },
  { path: "/users",              label: "ব্যবহারকারী",      icon: "members",   roles: ["admin"] },
  { path: "/settings",           label: "সেটিংস",            icon: "settings",  roles: ["admin"] },
];

// ── Protected Layout ────────────────────────────────────────
function AppLayout({ user, onLogout }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [sidebar,  setSidebar]  = useState(true);
  const [isMobile, setMobile]   = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => { const m = window.innerWidth < 768; setMobile(m); if (m) setSidebar(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const visibleNav = NAV.filter(n => n.roles.includes(user.role));
  const activeNav  = NAV.filter(n => n.path).find(n => n.path === "/dashboard"
    ? location.pathname === n.path
    : location.pathname.startsWith(n.path)) || NAV.find(n => n.path === "/dashboard");
  const roleInfo   = ROLES[user.role] || ROLES.member;

  const goTo = path => { navigate(path); if (isMobile) setSidebar(false); };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      {(sidebar || !isMobile) && (
        <>
          {isMobile && <div onClick={() => setSidebar(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:99 }} />}
          <aside style={{
            width: "var(--sidebar-w)", background: "var(--sidebar-bg)",
            display: "flex", flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            top: 0, left: 0, height: "100vh", zIndex: 100, flexShrink: 0,
            boxShadow: "4px 0 24px rgba(0,0,0,.2)",
          }}>

            {/* Logo */}
            <div style={{ padding: "1.4rem 1.2rem 1rem", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width:40,height:40,borderRadius:11,background:"linear-gradient(135deg,var(--gold),#a07810)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"1.3rem",fontWeight:800,boxShadow:"0 4px 12px rgba(196,154,26,.4)" }}>ب</div>
                <div>
                  <div style={{ fontFamily:"'Noto Serif Bengali',serif",fontSize:"0.82rem",fontWeight:800,color:"#fff",lineHeight:1.25 }}>বারাকাহ মুশারাকাহ</div>
                  <div style={{ fontSize:"0.6rem",color:"rgba(255,255,255,.4)",letterSpacing:"0.08em",marginTop:1 }}>FOUNDATION</div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex:1,padding:"0.85rem 0.65rem",display:"flex",flexDirection:"column",gap:2,overflowY:"auto" }}>
              {visibleNav.map((n, idx) => {
                if (n.divider) return (
                  <div key={`div-${idx}`} style={{ fontSize:"0.6rem",fontWeight:800,color:"rgba(255,255,255,.25)",textTransform:"uppercase",letterSpacing:"0.12em",padding:"10px 12px 4px",marginTop:4 }}>
                    {n.divider}
                  </div>
                );
                const isActive = n.path === "/dashboard"
                  ? location.pathname === n.path
                  : location.pathname.startsWith(n.path);
                return (
                  <button key={n.path} onClick={() => goTo(n.path)} style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"10px 12px",borderRadius:9,border:"none",
                    cursor:"pointer",width:"100%",textAlign:"left",
                    transition:"all .15s",fontFamily:"inherit",
                    fontSize:"0.875rem",fontWeight:isActive?700:500,
                    background:isActive?"rgba(196,154,26,.16)":"transparent",
                    color:isActive?"var(--gold)":"rgba(255,255,255,.6)",
                  }}>
                    <Icon name={n.icon} size={16} />
                    {n.label}
                    {isActive && <div style={{ marginLeft:"auto",width:4,height:4,borderRadius:"50%",background:"var(--gold)" }} />}
                  </button>
                );
              })}
            </nav>

            {/* User Info + Logout */}
            <div style={{ padding:"1rem",borderTop:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"rgba(196,154,26,.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--gold)",fontWeight:800,fontSize:"1rem",flexShrink:0 }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:"0.82rem",fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{user.name}</div>
                  <div style={{ fontSize:"0.68rem",fontWeight:600,color:roleInfo.color }}>{roleInfo.label}</div>
                </div>
              </div>
              <button onClick={onLogout} style={{
                width:"100%",padding:"8px",borderRadius:8,border:"1px solid rgba(255,255,255,.12)",
                background:"transparent",color:"rgba(255,255,255,.5)",cursor:"pointer",
                fontFamily:"inherit",fontSize:"0.8rem",fontWeight:600,
                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                transition:"all .15s",
              }}>
                🚪 লগআউট
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Main ────────────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",minWidth:0 }}>

        {/* Topbar */}
        <header style={{
          background:"var(--card)",borderBottom:"1px solid var(--border)",
          padding:"0 1.5rem",height:54,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"sticky",top:0,zIndex:50,
          boxShadow:"0 1px 8px rgba(0,0,0,.05)",
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <button onClick={() => setSidebar(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex",padding:4,borderRadius:6 }}>
              <Icon name="menu" size={20} />
            </button>
            <span style={{ fontSize:"0.875rem",fontWeight:700,color:"var(--text)" }}>
              {activeNav?.label || "বারাকাহ ফাউন্ডেশন"}
            </span>
          </div>

          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:"0.72rem",fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${roleInfo.color}15`,color:roleInfo.color }}>
              {roleInfo.label}
            </span>
            <div style={{ display:"flex",alignItems:"center",gap:6,background:"var(--bg)",padding:"5px 12px",borderRadius:20,border:"1px solid var(--border)" }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 0 2px rgba(22,163,74,.2)" }} />
              <span style={{ fontSize:"0.72rem",color:"var(--muted)",fontWeight:600 }}>{user.name}</span>
            </div>
          </div>
        </header>

        {/* Page Routes */}
        <main style={{ flex:1,padding:"1.5rem",maxWidth:1280,width:"100%",margin:"0 auto" }}>
          <Routes>
            <Route path="/"              element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/members"          element={<Members />} />
            <Route path="/members/new"      element={<MemberForm />} />
            <Route path="/members/:id"      element={<MemberDetail />} />
            <Route path="/members/:id/edit" element={<MemberForm />} />
            <Route path="/settings/*"       element={<Settings />} />
            <Route path="/reports/*"        element={<Reports />} />
            <Route path="/member-report"      element={<MemberReport />} />
            <Route path="/member-wise-report"    element={<MemberWiseReport />} />
            <Route path="/member-summary-report" element={<MemberSummaryReport />} />
            <Route path="/expenses"              element={<Expenses />} />
            <Route path="/expenses/new"          element={<ExpenseForm />} />
            <Route path="/expenses/:id/edit"     element={<ExpenseForm />} />
            <Route path="/reports/expenses"          element={<ExpenseReport />} />
            <Route path="/reports/bank-statement"    element={<BankStatement />} />
            <Route path="/accounts"      element={<Accounts />} />
            <Route path="/collections"   element={<Collections />} />
            <Route path="/donations"     element={<Donations />} />
            <Route path="/projects"      element={<Projects />} />
            <Route path="/beneficiaries" element={<Beneficiaries />} />
            <Route path="/meetings"      element={<Meetings />} />
            <Route path="/users"         element={<Users currentUser={user} />} />
            <Route path="*"              element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(getStoredUser);

  const handleAuth   = u  => setUser(u);
  const handleLogout = () => { clearAuth(); setUser(null); };

  return (
    <>
      <GlobalStyles />
      {!user || !isLoggedIn()
        ? <Login onAuth={handleAuth} />
        : <AppLayout user={user} onLogout={handleLogout} />
      }
    </>
  );
}

// ── Global Styles ──────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --primary:      #1a6b5a;
        --gold:         #c49a1a;
        --success:      #16a34a;
        --danger:       #dc2626;
        --bg:           #f2f6f4;
        --card:         #ffffff;
        --border:       #ddeae4;
        --text:         #1a2e28;
        --muted:        #6b8a7e;
        --sidebar-bg:   #0d3528;
        --sidebar-w:    224px;
      }
      body { font-family: 'Hind Siliguri', sans-serif; background: var(--bg); color: var(--text); }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      input:focus, select:focus, textarea:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px rgba(26,107,90,.12); }
      button { font-family: inherit; }
      @keyframes spin    { to { transform: rotate(360deg); } }
      @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes modalIn { from { opacity:0; transform:scale(.96); }       to { opacity:1; transform:scale(1);    } }
      button:not([disabled]):active { opacity:.85; transform:scale(.97); }
    `}</style>
  );
}
