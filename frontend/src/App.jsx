import { useState, useEffect } from "react";
import { Icon } from "./components.jsx";
import { getStoredUser, clearAuth, isLoggedIn, ROLES, isAdmin } from "./auth.js";

import Login        from "./pages/Login.jsx";
import Dashboard    from "./pages/Dashboard.jsx";
import Members      from "./pages/Members.jsx";
import Accounts     from "./pages/Accounts.jsx";
import Users        from "./pages/Users.jsx";
import { Donations, Projects, Beneficiaries, Meetings } from "./pages/Modules.jsx";

// ── NAV CONFIG ─────────────────────────────────────────────
const NAV = [
  { id: "dashboard",     label: "ড্যাশবোর্ড",      icon: "dashboard",   roles: ["admin","accountant","member","viewer"] },
  { id: "members",       label: "সদস্য",            icon: "members",     roles: ["admin","accountant","member"] },
  { id: "accounts",      label: "হিসাব",             icon: "accounts",    roles: ["admin","accountant"] },
  { id: "donations",     label: "দান ও অনুদান",     icon: "donations",   roles: ["admin","accountant"] },
  { id: "projects",      label: "প্রকল্প",           icon: "projects",    roles: ["admin","accountant","member","viewer"] },
  { id: "beneficiaries", label: "উপকারভোগী",        icon: "beneficiary", roles: ["admin","accountant","member"] },
  { id: "meetings",      label: "মিটিং",             icon: "meetings",    roles: ["admin","accountant","member","viewer"] },
  { id: "users",         label: "ব্যবহারকারী",      icon: "members",     roles: ["admin"] },
];

export default function App() {
  const [user,     setUser]     = useState(getStoredUser);
  const [active,   setActive]   = useState("dashboard");
  const [sidebar,  setSidebar]  = useState(true);
  const [isMobile, setMobile]   = useState(window.innerWidth < 768);

  useEffect(() => {
    const fn = () => { const m = window.innerWidth < 768; setMobile(m); if (m) setSidebar(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Not logged in → show Login
  if (!user || !isLoggedIn()) {
    return (
      <>
        <GlobalStyles />
        <Login onAuth={u => { setUser(u); setActive("dashboard"); }} />
      </>
    );
  }

  const navigate = id => { setActive(id); if (isMobile) setSidebar(false); };
  const logout   = () => { clearAuth(); setUser(null); };

  // Filter nav by role
  const visibleNav = NAV.filter(n => n.roles.includes(user.role));

  const PAGES = {
    dashboard:     <Dashboard />,
    members:       <Members />,
    accounts:      <Accounts />,
    donations:     <Donations />,
    projects:      <Projects />,
    beneficiaries: <Beneficiaries />,
    meetings:      <Meetings />,
    users:         <Users currentUser={user} />,
  };

  const roleInfo = ROLES[user.role] || ROLES.member;

  return (
    <>
      <GlobalStyles />
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
                {visibleNav.map(n => {
                  const isActive = active === n.id;
                  return (
                    <button key={n.id} onClick={() => navigate(n.id)} style={{
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
                <button onClick={logout} style={{
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
                {NAV.find(n => n.id === active)?.label}
              </span>
            </div>

            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              {/* Role badge */}
              <span style={{ fontSize:"0.72rem",fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${roleInfo.color}15`,color:roleInfo.color }}>
                {roleInfo.label}
              </span>
              <div style={{ display:"flex",alignItems:"center",gap:6,background:"var(--bg)",padding:"5px 12px",borderRadius:20,border:"1px solid var(--border)" }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 0 2px rgba(22,163,74,.2)" }} />
                <span style={{ fontSize:"0.72rem",color:"var(--muted)",fontWeight:600 }}>{user.name}</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main style={{ flex:1,padding:"1.5rem",maxWidth:1280,width:"100%",margin:"0 auto" }}>
            {PAGES[active] || <Dashboard />}
          </main>
        </div>
      </div>
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
