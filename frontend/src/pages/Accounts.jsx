import { useState, useEffect, useCallback } from "react";
import { getAccounts, createAccount, updateAccount, deleteAccount, getMembers, getBankAccounts } from "../api.js";
import {
    Modal, Field, Input, Select, Textarea, Btn,
    StatCard, Table, Badge, Toast, PageHeader,
    StatsGrid, FormGrid, FormActions, FilterTabs,
    useToast, fmtDate, fmtMoney, today,
} from "../components.jsx";

// ── Constants ─────────────────────────────────────────────
const MONTHS = [
    { value:"01", label:"জানুয়ারি"   },
    { value:"02", label:"ফেব্রুয়ারি" },
    { value:"03", label:"মার্চ"       },
    { value:"04", label:"এপ্রিল"      },
    { value:"05", label:"মে"          },
    { value:"06", label:"জুন"         },
    { value:"07", label:"জুলাই"       },
    { value:"08", label:"আগস্ট"       },
    { value:"09", label:"সেপ্টেম্বর"  },
    { value:"10", label:"অক্টোবর"     },
    { value:"11", label:"নভেম্বর"     },
    { value:"12", label:"ডিসেম্বর"    },
];

const curYear  = new Date().getFullYear();
const curMonth = String(new Date().getMonth() + 1).padStart(2, "0");
const YEARS    = Array.from({ length: 6 }, (_, i) => curYear - 1 + i);

// depositMonth format: "2026-03"
const EMPTY_COL = {
    memberId:        "",
    bankAccountId:   "",
    collectionMonth: curMonth,
    collectionYear:  String(curYear),
    date:            today(),
    description:     "মাসিক চাঁদা",
    amount:          "",
    notes:           "",
    status:          "paid",
};

const SectionTitle = ({ children }) => (
    <div style={{
        fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        borderBottom: "2px solid var(--border)", paddingBottom: 6, marginBottom: "1rem",
    }}>{children}</div>
);

// ── Helpers ───────────────────────────────────────────────
const monthLabel = v => MONTHS.find(m => m.value === v)?.label || v || "—";

// "2026-03" → { year:"2026", month:"03" }
const parseDepositMonth = dm => {
    if (!dm) return { year: "", month: "" };
    const parts = dm.split("-");
    return { year: parts[0] || "", month: parts[1] || "" };
};

// ── STATUS Badge ──────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        paid:    { color: "var(--success)", label: "পরিশোধিত"  },
        unpaid:  { color: "var(--danger)",  label: "বকেয়া"     },
        partial: { color: "var(--gold)",    label: "আংশিক"     },
    };
    const s = map[status] || { color: "var(--muted)", label: status || "—" };
    return <Badge color={s.color}>{s.label}</Badge>;
};

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function Accounts() {
    const [data,      setData]      = useState([]);
    const [summary,   setSummary]   = useState({ total_paid: 0, total_pending: 0, count: 0 });
    const [members,   setMembers]   = useState([]);
    const [banks,     setBanks]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [filter,    setFilter]    = useState("all");   // all | paid | unpaid | partial
    const [modal,     setModal]     = useState(false);
    const [form,      setForm]      = useState(EMPTY_COL);
    const [saving,    setSaving]    = useState(false);
    const [toast,     showToast]    = useToast();

    // ── Load ──────────────────────────────────────────────
    const load = useCallback(async () => {
        try {
            setLoading(true);

            // filter → status param পাঠাই
            const statusParam = filter !== "all" ? `?status=${filter}` : "";

            const [res, mems, bankList] = await Promise.all([
                getAccounts(statusParam),   // api.js: getAccounts(param) → /api/accounts{param}
                getMembers(),
                getBankAccounts(),
            ]);

            // Backend returns { data: [...], summary: {...} }
            const rows = Array.isArray(res) ? res : (res.data || []);
            const sum  = res.summary || { total_paid: 0, total_pending: 0, count: 0 };

            setData(rows);
            setSummary(sum);
            setMembers(Array.isArray(mems) ? mems : []);
            setBanks(Array.isArray(bankList) ? bankList : []);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

    // ── Member select → auto-fill amount & description ────
    const handleMemberChange = e => {
        const mid = e.target.value;
        const mem = members.find(m => String(m.id) === String(mid));
        setForm(p => {
            const desc = mem
                ? `${mem.name} — মাসিক চাঁদা ${monthLabel(p.collectionMonth)} ${p.collectionYear}`
                : p.description;
            return {
                ...p,
                memberId:    mid,
                amount:      mem?.fee ?? p.amount,
                description: desc,
            };
        });
    };

    const handleMonthChange = e => {
        const month = e.target.value;
        setForm(p => {
            const mem = members.find(m => String(m.id) === String(p.memberId));
            return {
                ...p,
                collectionMonth: month,
                description: mem
                    ? `${mem.name} — মাসিক চাঁদা ${monthLabel(month)} ${p.collectionYear}`
                    : p.description,
            };
        });
    };

    const handleYearChange = e => {
        const year = e.target.value;
        setForm(p => {
            const mem = members.find(m => String(m.id) === String(p.memberId));
            return {
                ...p,
                collectionYear: year,
                description: mem
                    ? `${mem.name} — মাসিক চাঁদা ${monthLabel(p.collectionMonth)} ${year}`
                    : p.description,
            };
        });
    };

    // ── Open add/edit modal ───────────────────────────────
    const openAdd = () => {
        setForm(EMPTY_COL);
        setModal(true);
    };

    const openEdit = r => {
        // deposit_month from API: "2026-03"
        const { year, month } = parseDepositMonth(r.deposit_month);
        setForm({
            id:              r.id,
            memberId:        r.member_id        || "",
            bankAccountId:   r.bank_account_id  || "",
            collectionMonth: month,
            collectionYear:  year,
            date:            r.deposit_date     || today(),
            description:     r.description      || "",
            amount:          r.amount           || "",
            notes:           "",
            status:          r.status           || "paid",
        });
        setModal(true);
    };

    // ── Submit ────────────────────────────────────────────
    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.memberId)  return showToast("সদস্য বেছে নিন", "error");
        if (!form.amount)    return showToast("পরিমাণ আবশ্যক",  "error");

        // Rust DepositPayload এর field names (camelCase, serde rename)
        const payload = {
            memberId:      Number(form.memberId),
            bankAccountId: Number(form.bankAccountId) || null,
            depositMonth:  `${form.collectionYear}-${form.collectionMonth}`, // "2026-03"
            depositDate:   form.date,
            amount:        Number(form.amount),
            status:        form.status || "paid",
            description:   form.description || null,
            reference:     null,
        };

        try {
            setSaving(true);
            form.id
                ? await updateAccount(form.id, payload)
                : await createAccount(payload);
            showToast("সংরক্ষিত হয়েছে ✓");
            setModal(false);
            load();
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async id => {
        if (!window.confirm("এই এন্ট্রি ও সংশ্লিষ্ট লেনদেন মুছে ফেলবেন?")) return;
        try {
            await deleteAccount(id);
            showToast("মুছে ফেলা হয়েছে");
            load();
        } catch (e) {
            showToast(e.message, "error");
        }
    };

    const selectedMember = members.find(m => String(m.id) === String(form.memberId));

    // ── Render ────────────────────────────────────────────
    return (
        <div>
            <Toast toast={toast} />

            <PageHeader title="মাসিক চাঁদা কালেকশন">
                <Btn icon="add" variant="primary" onClick={openAdd}>
                    নতুন কালেকশন এন্ট্রি
                </Btn>
            </PageHeader>

            {/* ── Stats ── */}
            <StatsGrid>
                <StatCard
                    label="মোট পরিশোধিত"
                    value={fmtMoney(summary.total_paid)}
                    icon="money_in"
                    color="var(--success)"
                />
                <StatCard
                    label="মোট বকেয়া"
                    value={fmtMoney(summary.total_pending)}
                    icon="money_out"
                    color="var(--danger)"
                />
                <StatCard
                    label="মোট এন্ট্রি"
                    value={summary.count || data.length}
                    icon="trend_up"
                    color="var(--primary)"
                />
                <StatCard
                    label="সদস্য সংখ্যা"
                    value={members.length}
                    icon="members"
                    color="var(--gold)"
                />
            </StatsGrid>

            {/* ── Filter Tabs ── */}
            <FilterTabs
                value={filter}
                onChange={setFilter}
                options={[
                    { value: "all",     label: "সকল"       },
                    { value: "paid",    label: "পরিশোধিত"  },
                    { value: "unpaid",  label: "বকেয়া"     },
                    { value: "partial", label: "আংশিক"     },
                ]}
            />

            {/* ── Table ── */}
            <Table
                loading={loading}
                cols={[
                    {
                        key: "deposit_date",
                        label: "তারিখ",
                        render: r => fmtDate(r.deposit_date),
                    },
                    {
                        key: "member_name",
                        label: "সদস্য",
                        render: r => r.member_name || "—",
                    },
                    {
                        key: "deposit_month",
                        label: "মাস / বছর",
                        render: r => {
                            if (!r.deposit_month) return "—";
                            const { year, month } = parseDepositMonth(r.deposit_month);
                            return `${monthLabel(month)} ${year}`;
                        },
                    },
                    {
                        key: "bank_name",
                        label: "ব্যাংক",
                        render: r => r.bank_name
                            ? `${r.bank_name} (${r.account_number || ""})`
                            : "নগদ",
                    },
                    {
                        key: "amount",
                        label: "পরিমাণ",
                        render: r => (
                            <span style={{ fontWeight: 700, color: "var(--success)" }}>
                                +{fmtMoney(r.amount)}
                            </span>
                        ),
                    },
                    {
                        key: "status",
                        label: "অবস্থা",
                        render: r => <StatusBadge status={r.status} />,
                    },
                    {
                        key: "description",
                        label: "বিবরণ",
                        render: r => r.description || "—",
                    },
                ]}
                rows={data}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            {/* ── Modal ── */}
            {modal && (
                <Modal
                    title={form.id ? "এন্ট্রি সম্পাদনা" : "মাসিক চাঁদা কালেকশন এন্ট্রি"}
                    onClose={() => setModal(false)}
                    wide
                >
                    <form onSubmit={handleSubmit}>
                        <SectionTitle>সদস্য ও কালেকশন তথ্য</SectionTitle>

                        <FormGrid>
                            {/* সদস্য */}
                            <Field label="সদস্য" required half>
                                <Select value={form.memberId} onChange={handleMemberChange}>
                                    <option value="">— সদস্য বেছে নিন —</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.phone}) — চাঁদা {fmtMoney(m.fee)}
                                        </option>
                                    ))}
                                </Select>
                            </Field>

                            {/* পরিমাণ */}
                            <Field label="পরিমাণ (৳)" required half>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={set("amount")}
                                    placeholder="0.00"
                                />
                            </Field>

                            {/* কালেকশন মাস */}
                            <Field label="কালেকশন মাস" required half>
                                <Select value={form.collectionMonth} onChange={handleMonthChange}>
                                    {MONTHS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </Select>
                            </Field>

                            {/* কালেকশন বছর */}
                            <Field label="কালেকশন বছর" required half>
                                <Select value={form.collectionYear} onChange={handleYearChange}>
                                    {YEARS.map(y => (
                                        <option key={y} value={String(y)}>{y}</option>
                                    ))}
                                </Select>
                            </Field>

                            {/* ব্যাংক */}
                            <Field label="ব্যাংক অ্যাকাউন্ট" half>
                                <Select value={form.bankAccountId} onChange={set("bankAccountId")}>
                                    <option value="">— নগদ —</option>
                                    {banks.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.bank_name} — {b.account_name} ({b.account_number})
                                        </option>
                                    ))}
                                </Select>
                            </Field>

                            {/* তারিখ */}
                            <Field label="তারিখ" required half>
                                <Input type="date" value={form.date} onChange={set("date")} />
                            </Field>

                            {/* অবস্থা */}
                            <Field label="অবস্থা" half>
                                <Select value={form.status} onChange={set("status")}>
                                    <option value="paid">পরিশোধিত</option>
                                    <option value="unpaid">বকেয়া</option>
                                    <option value="partial">আংশিক</option>
                                </Select>
                            </Field>

                            {/* বিবরণ */}
                            <Field label="বিবরণ" half>
                                <Input
                                    value={form.description}
                                    onChange={set("description")}
                                    placeholder="বিবরণ লিখুন"
                                />
                            </Field>
                        </FormGrid>

                        {/* Preview */}
                        {selectedMember && (
                            <div style={{
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: 10, padding: "12px 16px",
                                marginBottom: "1rem",
                            }}>
                                <div style={{
                                    fontSize: "0.72rem", fontWeight: 700,
                                    color: "var(--muted)", textTransform: "uppercase",
                                    marginBottom: 6,
                                }}>প্রিভিউ</div>
                                <div style={{
                                    display: "flex", gap: "1.5rem",
                                    flexWrap: "wrap", fontSize: "0.875rem",
                                }}>
                                    <span>👤 <strong>{selectedMember.name}</strong></span>
                                    <span>📅 {monthLabel(form.collectionMonth)} {form.collectionYear}</span>
                                    <span>🏦 {banks.find(b => String(b.id) === String(form.bankAccountId))?.bank_name || "নগদ"}</span>
                                    <span style={{ color: "var(--success)", fontWeight: 700 }}>
                                        ৳ {Number(form.amount || 0).toLocaleString("bn-BD")}
                                    </span>
                                    <StatusBadge status={form.status} />
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 6 }}>
                                    🔑 Ref: DEP-{form.memberId}-{form.collectionYear}{form.collectionMonth}
                                </div>
                            </div>
                        )}

                        <FormActions onCancel={() => setModal(false)} saving={saving} />
                    </form>
                </Modal>
            )}
        </div>
    );
}