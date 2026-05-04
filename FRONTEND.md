# Frontend Documentation — Barakah Foundation

## Overview

The frontend is a **React** single-page application (SPA) with **Vite** as the build tool. It provides a responsive UI with role-based access control, form validation, and real-time data updates.

## Technology Stack

- **Framework**: React 18.x
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Fetch API with custom wrapper
- **Authentication**: JWT tokens (localStorage)
- **Styling**: CSS-in-JS (inline styles)
- **UI Components**: Custom component library
- **Localization**: Bengali (Bangla) UI with English comments
- **Date Formatting**: Native `Intl` API + custom utilities

## Project Structure

```
frontend/
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Root component, routing, navigation
│   ├── api.js                # API client wrapper
│   ├── auth.js               # Authentication utilities
│   ├── components.jsx        # Reusable UI components
│   ├── pages/
│   │   ├── Login.jsx         # Authentication page
│   │   ├── Dashboard.jsx     # Summary & statistics
│   │   ├── Members.jsx       # Member list & management
│   │   ├── MemberForm.jsx    # Member create/edit
│   │   ├── MemberDetail.jsx  # Member profile
│   │   ├── MemberReport.jsx  # Member deposit report
│   │   ├── MemberWiseReport.jsx    # Member-wise collection summary
│   │   ├── MemberSummaryReport.jsx # Member summary with charts
│   │   ├── Accounts.jsx      # Monthly collection entries
│   │   ├── Collections.jsx   # Ad-hoc collections
│   │   ├── Settings.jsx      # Chart of accounts, bank accounts
│   │   ├── Reports.jsx       # Financial reports (P&L, Cash Flow, etc)
│   │   ├── Expenses.jsx      # Expense tracking
│   │   ├── ExpenseForm.jsx   # Create/edit expense
│   │   ├── ExpenseReport.jsx # Expense reports
│   │   ├── BankStatement.jsx # Bank statement
│   │   ├── Users.jsx         # User management (admin)
│   │   ├── Modules.jsx       # Donations, Projects, Beneficiaries, Meetings
│   │   └── ExpenseCategories.jsx   # Expense category settings
│   ├── index.css             # Global styles
│   └── vite.config.js        # Vite configuration
├── public/                   # Static assets
├── package.json
├── .env.production          # Production environment variables
└── vite.config.js
```

## Component Architecture

### Core Components Library (components.jsx)

#### Layout Components
- **Modal**: Overlay dialog for forms
- **PageHeader**: Page title with action buttons
- **Sidebar**: Navigation menu
- **Topbar**: Header with user info

#### Form Components
- **Field**: Form field wrapper with label
- **Input**: Text input with validation
- **Select**: Dropdown/select field
- **Textarea**: Multi-line text input
- **FormGrid**: Layout for form fields (responsive grid)
- **FormActions**: Submit/Cancel buttons
- **Btn**: Button with variants (primary, secondary, muted, danger)

#### Display Components
- **Table**: Data table with sorting, filtering, edit/delete actions
- **Badge**: Status indicator with color
- **StatCard**: Statistics card (icon + value + label)
- **StatsGrid**: Grid layout for statistics
- **Toast**: Notification messages (success, error, info)
- **Loader**: Loading spinner
- **FilterTabs**: Tab filter for data (all, paid, unpaid, etc)

#### Utilities
- **useToast()**: Hook for showing notifications
- **fmtDate()**: Format date (DD-MMM-YYYY)
- **fmtMoney()**: Format currency with commas (৳)
- **today()**: Get today's date as YYYY-MM-DD

### Context & State

#### Authentication (auth.js)
```javascript
getStoredUser()       // Get user from localStorage
getToken()            // Get JWT token
setAuth(user, token)  // Save user & token
clearAuth()           // Logout (clear storage)
isLoggedIn()          // Check if authenticated

// User object structure
{
  id: 1,
  name: "User Name",
  email: "user@example.com",
  role: "member",  // admin, accountant, member, viewer
  status: "active"
}
```

#### API Client (api.js)
```javascript
// Internal request function
req(url, options)  // Handles auth headers, error parsing

// HTTP methods
api.get(url)
api.post(url, body)
api.put(url, body)
api.delete(url)

// Exported functions
getMembers(search)
getMember(id)
createMember(body)
updateMember(id, body)
deleteMember(id)

getAccounts(filter)
createAccount(body)
updateAccount(id, body)
deleteAccount(id)
approveAccount(id)

getChartOfAccounts()
createChartOfAccount(body)
approveChartOfAccount(id)

// ... many more
```

## Navigation & Routing

### Role-Based Navigation

Navigation items are defined in `App.jsx`:

```javascript
const NAV = [
  { path: "/dashboard",    roles: ["admin","accountant","member","viewer"] },
  { path: "/members",      roles: ["admin","accountant"] },
  { path: "/accounts",     roles: ["admin","accountant","member"] },
  { path: "/reports",      roles: ["admin","accountant","member"] },
  { path: "/expenses",     roles: ["admin","accountant"] },
  { path: "/users",        roles: ["admin"] },
  { path: "/settings",     roles: ["admin"] },
  // ... more routes
];

// Each role sees only permitted routes
const visibleNav = NAV.filter(n => n.roles.includes(user.role));
```

### Page Routes (React Router)

```javascript
<Routes>
  <Route path="/"              element={<Navigate to="/dashboard" />} />
  <Route path="/dashboard"     element={<Dashboard />} />
  <Route path="/members"       element={<Members />} />
  <Route path="/members/new"   element={<MemberForm />} />
  <Route path="/members/:id"   element={<MemberDetail />} />
  <Route path="/accounts"      element={<Accounts />} />
  <Route path="/reports/*"     element={<Reports />} />
  {/* ... more routes */}
</Routes>
```

## Page Reference

### Login (pages/Login.jsx)
- Email and password input
- Calls `POST /api/auth/login`
- Stores JWT token and user info
- Redirects to dashboard on success

### Dashboard (pages/Dashboard.jsx)
- Summary statistics cards
- Recent activities
- Quick links to main features
- Shows role-specific content

### Members (pages/Members.jsx)
- List all members with search
- Add new member button
- Edit/delete member actions
- Download all member attachments as ZIP
- **Admin/Accountant**: Full list
- **Member/Viewer**: View only

### Accounts (pages/Accounts.jsx)
**Monthly Collection Entries**

**Admin/Accountant View**:
- See all collection entries from all members
- Can create entries for any member (default status: "paid")
- Edit any entry
- Delete entries
- Approve pending entries with green button
- Summary shows: Total Paid, Total Unpaid, Total Approved, Count

**Member View**:
- See only their own collection entries
- Can submit new entry ("চাঁদা জমা দিন" button)
- Member field: Auto-filled, read-only
- Status field: Read-only, shows "অপেক্ষমাণ" (Pending - awaiting admin approval)
- Submitted entries default to "pending" status
- Summary: Only shows their entries

**Collection Status Values**:
- `paid`: Payment confirmed (green badge)
- `unpaid`: Not yet paid (red badge)
- `partial`: Partially paid (yellow/gold badge)
- `pending`: Awaiting admin approval (yellow badge)
- `approved`: Admin approved (green badge)

### Collections (pages/Collections.jsx)
- Ad-hoc collection entries
- Different from monthly contributions
- Create/delete collection entries
- Associate with member

### Settings (pages/Settings.jsx)
Tabbed interface for three settings sections:

#### 1. Chart of Accounts
- List all accounts (income, expense, asset, liability, equity)
- Create new account
- Edit/delete accounts
- **Status badges**: Pending (yellow), Approved (green)
- **Admin only**: Approve button for pending accounts
- Pending accounts don't appear in financial reports

#### 2. Bank Accounts
- List configured bank accounts
- Create new bank account
- Edit/delete accounts
- Active/Inactive toggle

#### 3. Expense Categories
- List expense categories
- Create/edit/delete categories
- Toggle active/inactive status

### Reports (pages/Reports.jsx)
Tabbed interface for financial reports:

#### 1. Profit & Loss
- Income vs Expense comparison
- Date range filter (from/to)
- Shows: Account code, category, amount, percentage
- Only includes approved accounts
- Calculates net profit

#### 2. Cash Flow
- Inflow vs Outflow by date
- Shows running balance
- Date range filter
- Daily summary

#### 3. Balance Sheet
- Assets, Liabilities, Equity
- Current balances
- Verifies: Total Assets = Total Liabilities + Equity

#### 4. Trial Balance
- Debit and Credit totals for each account
- Verifies: Total Debits = Total Credits
- Only approved accounts

#### 5. Bank Statement
- Bank account transactions
- Date range filter
- Opening balance, debits, credits, closing balance
- Filter by bank account

### Member Reports (pages/MemberReport.jsx)
- Member deposit summary
- Month-wise and year-wise breakdown
- Shows paid/unpaid status
- Search by member

### Member Wise Report (pages/MemberWiseReport.jsx)
- Member-wise collection summary
- Shows member details
- Monthly deposits table
- Special collections
- Summary cards:
  - Total Monthly Deposits (green)
  - Total Special Collections (orange)
  - Grand Total (blue)

### Expenses (pages/Expenses.jsx)
- Create/edit/delete expenses
- Approve/reject workflow (admin)
- Category filter
- Status: draft, pending, approved, rejected
- Summary statistics by category

### Bank Statement (pages/BankStatement.jsx)
- Bank-specific transactions
- Opening/closing balance
- Debit/credit columns

### Users (pages/Users.jsx)
- List all users (admin only)
- Create new user
- Edit user details and role
- Delete users
- Current user highlighted

## Authentication & Authorization

### Login Flow
```javascript
// User enters credentials
POST /api/auth/login
  → Returns: { token, user: { id, name, email, role } }
  → Store in localStorage
  → Redirect to /dashboard

// Subsequent requests include JWT
Authorization: Bearer <token>
```

### Protected Routes
```javascript
// Routes check if user is logged in
if (!user || !isLoggedIn()) {
  show Login page
} else {
  show protected content with role-based visibility
}
```

### Token Expiration
```javascript
// If 401 Unauthorized received
clearAuth()  // Remove token and user
window.location.reload()  // Redirect to login
```

## Forms & Validation

### Form Pattern
```javascript
const [form, setForm] = useState(EMPTY_OBJECT);
const [saving, setSaving] = useState(false);

const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

const handleSubmit = async e => {
  e.preventDefault();
  
  // Validate
  if (!form.name) return showToast("Name required", "error");
  
  try {
    setSaving(true);
    form.id 
      ? await updateItem(form.id, form)
      : await createItem(form);
    showToast("Saved ✓");
    setModal(false);
    load();  // Refresh list
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    setSaving(false);
  }
};
```

### Common Validations
```javascript
if (!form.email) return showToast("Email required", "error");
if (!form.amount || Number(form.amount) <= 0) return showToast("Valid amount required", "error");
if (!form.date) return showToast("Date required", "error");
if (!selectedMember) return showToast("Select member", "error");
```

## Data Formatting Utilities

### Currency Formatting
```javascript
fmtMoney(amount)  // 10000 → "১০,০০০"
fmtMoney(amount)  // Works with Decimal from backend

// Usage in JSX
<span style={{ fontWeight: 700, color: "var(--success)" }}>
  +{fmtMoney(r.amount)}
</span>
```

### Date Formatting
```javascript
fmtDate(dateString)  // "2026-03-15" → "15-Mar-2026"
today()              // Returns "2026-03-15" format
```

### Month Helper
```javascript
monthLabel(value)  // "03" → "মার্চ" (March in Bengali)
parseDepositMonth(dm)  // "2026-03" → { year: "2026", month: "03" }
```

## Styling Approach

### CSS Variables (Root)
```css
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
```

### Inline Styles
All styles are inline (CSS-in-JS) for component isolation:

```javascript
<div style={{
  display: "flex",
  gap: "1rem",
  padding: "1.5rem",
  borderRadius: 10,
  background: "var(--card)",
  border: "1px solid var(--border)"
}}>
```

### Responsive Design
```javascript
const [isMobile, setMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const fn = () => setMobile(window.innerWidth < 768);
  window.addEventListener("resize", fn);
  return () => window.removeEventListener("resize", fn);
}, []);
```

## State Management

### Local Component State
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [modal, setModal] = useState(false);
const [filter, setFilter] = useState("all");
```

### Custom Hooks
```javascript
const [toast, showToast] = useToast();

// Usage
showToast("Success message");
showToast("Error message", "error");
showToast("Info message", "info");
```

### Effects & Callbacks
```javascript
const load = useCallback(async () => {
  try {
    setLoading(true);
    const data = await fetchData(filter);
    setData(data);
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    setLoading(false);
  }
}, [filter]);  // Re-run when filter changes

useEffect(() => {
  load();
}, [load]);
```

## Key Features

### 1. Member Collection Approval Workflow

**Member Flow**:
1. Member navigates to /accounts
2. Page title: "আমার মাসিক চাঁদা" (My Monthly Collection)
3. Button: "চাঁদা জমা দিন" (Submit Payment)
4. Form shows:
   - Member: Auto-filled with their name (read-only)
   - Amount: Required
   - Date: Required
   - Status: Read-only field showing "অপেক্ষমাণ (অ্যাডমিন অনুমোদন অপেক্ষমাণ)"
5. Submit → Entry created with status='pending'
6. Table shows only their entries

**Admin Flow**:
1. Admin navigates to /accounts
2. Page title: "মাসিক চাঁদা কালেকশন" (Monthly Collection)
3. Button: "নতুন কালেকশন এন্ট্রি" (New Collection Entry)
4. Can see entries from all members
5. Each pending entry shows green "অনুমোদন" (Approve) button
6. Click approve → Status changes to 'approved'

### 2. Chart of Accounts Approval

**User Flow**:
1. Navigate to Settings → Chart of Accounts
2. See list of accounts with status badges (pending/approved)
3. Create new account → Status defaults to 'pending'
4. **Admin only**: Green "অনুমোদন করুন" button for pending accounts
5. Approve → Status changes to 'approved'
6. Approved accounts appear in financial reports

### 3. Member Attachments Download

**Feature**:
- Members page has "সংযুক্তি ডাউনলোড" (Download Attachments) button
- Downloads all member files as organized ZIP
- Structure:
  - `Member_Wise/Member_1_Name_Phone/image.jpg, nid.pdf, nominee_image.jpg, nominee_nid.pdf`
  - `All_Member_Pictures/Name_Phone.jpg`
  - `All_Member_NIDs/Name_Phone.pdf`
  - `All_Nominee_Pictures/Name_Phone.jpg`
  - `All_Nominee_NIDs/Name_Phone.pdf`

### 4. Responsive Layout

**Desktop**: Full sidebar + content
**Mobile**: Collapsible sidebar, hamburger menu

### 5. Multi-Language Support

**Implemented**: Bengali (Bangla) UI
- All labels and messages in Bengali
- English code comments
- Numeric formatting: Bengali numerals or English (configurable)

## Development

### Setup
```bash
cd frontend
npm install
npm run dev  # Start dev server on http://localhost:5173
npm run build  # Production build
```

### Environment Variables (.env.production)
```env
VITE_API_BASE=/api  # Backend API base URL
```

### Build & Deploy
```bash
npm run build
# Outputs to dist/
# Deploy dist/ contents to web server
```

## Performance Optimization

1. **Code Splitting**: Routes lazy-loaded with React Router
2. **Image Optimization**: No large images (inline SVG for icons)
3. **State Management**: Minimal state, no global store needed
4. **Memoization**: useCallback for event handlers with dependencies
5. **Caching**: User data cached in localStorage (session-based)

## Common Patterns

### Data Loading Pattern
```javascript
const load = useCallback(async () => {
  try {
    setLoading(true);
    const data = await api.get(endpoint);
    setData(data);
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    setLoading(false);
  }
}, [dependency]);

useEffect(() => { load(); }, [load]);
```

### Modal Form Pattern
```javascript
const [modal, setModal] = useState(false);
const [form, setForm] = useState(EMPTY_FORM);

const openAdd = () => {
  setForm(EMPTY_FORM);
  setModal(true);
};

const openEdit = (row) => {
  setForm(row);
  setModal(true);
};

{modal && (
  <Modal onClose={() => setModal(false)}>
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <FormActions onCancel={() => setModal(false)} saving={saving} />
    </form>
  </Modal>
)}
```

### Conditional Rendering Pattern
```javascript
const isMember = user?.role === "member";
const isAdmin = user?.role === "admin";

{isMember ? (
  <div>Member-only content</div>
) : (
  <div>Admin/Accountant content</div>
)}

{/* Array conditionals for table columns */}
cols={[
  { key: "name", label: "Name" },
  ...(isAdmin ? [{ key: "actions", label: "Actions" }] : []),
]}
```

## Troubleshooting

### 401 Unauthorized
- Token expired or invalid
- Check localStorage for token
- Login again

### API not responding
- Check backend is running
- Verify VITE_API_BASE environment variable
- Check browser console for CORS errors

### Member sees admin routes
- Check NAV configuration in App.jsx
- Verify user.role is set correctly
- Check role in browser localStorage

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [React Router Documentation](https://reactrouter.com)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
