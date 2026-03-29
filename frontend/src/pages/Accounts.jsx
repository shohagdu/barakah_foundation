import { useState, useEffect, useCallback } from "react";
import { getAccounts, createAccount, updateAccount, deleteAccount, getMembers, getBankAccounts } from "../api.js";
import {
    Modal, Field, Input, Select, Textarea, Btn,
    StatCard, Table, Badge, Toast, PageHeader,
    StatsGrid, FormGrid, FormActions, FilterTabs,
    useToast, fmtDate, fmtMoney, today,
} from "../components.jsx";

const INC_CATS = ["চাঁদা","দান","অনুদান","প্রকল্প আয়","ব্যাংক সুদ","অন্যান্য"];
const EXP_CATS = ["অফিস ভাড়া","খাবার","পরিবহন","প্রকল্প ব্যয়","বেতন","সেবা চার্জ","অন্যান্য"];

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

const EMPTY_COL = {
    type:"income", category:"চাঁদা",
    memberId:"", bankAccountId:"",
    collectionMonth: curMonth,
    collectionYear:  String(curYear),
    date: today(), description:"মাসিক চাঁদা", amount:"", notes:"",
};

const EMPTY_GEN = {
    type:"income", category:"",
    memberId:"", bankAccountId:"",
    collectionMonth:"", collectionYear:"",
    date: today(), description:"", amount:"", notes:"",
};

const SectionTitle = ({ children }) => (
    <div style={{
        fontSize:"0.72rem", fontWeight:700, color:"var(--primary)",
        textTransform:"uppercase", letterSpacing:"0.08em",
        borderBottom:"2px solid var(--border)", paddingBottom:6, marginBottom:"1rem",
    }}>{children}</div>
);

export default function Accounts() {
    const [data,      setData]      = useState([]);
    const [summary,   setSummary]   = useState({ income:0, expense:0, balance:0 });
    const [members,   setMembers]   = useState([]);
    const [banks,     setBanks]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [filter,    setFilter]    = useState("all");
    const [entryType, setEntryType] = useState("collection");
    const [modal,     setModal]     = useState(false);
    const [form,      setForm]      = useState(EMPTY_COL);
    const [saving,    setSaving]    = useState(false);
    const [toast,     showToast]    = useToast();

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [res, mems, bankList] = await Promise.all([
                getAccounts(filter),
                getMembers(),
                getBankAccounts(),
            ]);
            const rows = res.data || res;
            const sum  = res.summary || { income:0, expense:0, balance:0 };
            setData(Array.isArray(rows) ? rows : []);
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

    const monthLabel = v => MONTHS.find(m => m.value === v)?.label || v || "—";

    const buildDesc = (mid, month, year) => {
        const mem = members.find(m => String(m.id) === String(mid));
        if (!mem) return form.description;
        return `${mem.name} — মাসিক চাঁদা ${monthLabel(month)} ${year}`;
    };

    const handleMemberChange = e => {
        const mid = e.target.value;
        const mem = members.find(m => String(m.id) === String(mid));
        setForm(p => ({
            ...p,
            memberId:    mid,
            amount:      mem?.fee ?? p.amount,
            description: buildDesc(mid, p.collectionMonth, p.collectionYear),
        }));
    };

    const handleMonthChange = e => {
        const month = e.target.value;
        setForm(p => ({
            ...p,
            collectionMonth: month,
            description:     buildDesc(p.memberId, month, p.collectionYear),
        }));
    };

    const handleYearChange = e => {
        const year = e.target.value;
        setForm(p => ({
            ...p,
            collectionYear: year,
            description:    buildDesc(p.memberId, p.collectionMonth, year),
        }));
    };

    const openAdd = type => {
        setEntryType(type);
        setForm(type === "collection" ? EMPTY_COL : EMPTY_GEN);
        setModal(true);
    };

    const openEdit = r => {
        const isCol = !!r.memberId;
        setEntryType(isCol ? "collection" : "general");
        setForm({
            id:              r.id,
            type:            r.txType || "income",
            category:        r.category || "",
            memberId:        r.memberId || "",
            bankAccountId:   r.bankAccountId || "",
            collectionMonth: r.collectionMonth || "",
            collectionYear:  r.collectionYear  || "",
            date:            r.date || today(),
            description:     r.description || "",
            amount:          r.amount || "",
            notes:           r.notes  || "",
        });
        setModal(true);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.amount)      return showToast("পরিমাণ আবশ্যক", "error");
        if (!form.description) return showToast("বিবরণ আবশ্যক",  "error");
        if (entryType === "collection" && !form.memberId)
            return showToast("সদস্য বেছে নিন", "error");

        const payload = {
            memberId:        form.memberId        || null,
            bankAccountId:   form.bankAccountId   || null,
          //  collectionMonth: form.collectionMonth || null,
            collectionYear:  form.collectionYear  || null,
        //    tx_type:         form.tx_type  || null,
            date:            form.date,
        //    type:            form.type || 'test',
         //   category:        form.category        || null,
        //    description:     form.description,
            amount:          Number(form.amount),
            notes:           form.notes           || null,
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
        if (!window.confirm("এই এন্ট্রি মুছে ফেলবেন?")) return;
        try {
            await deleteAccount(id);
            showToast("মুছে ফেলা হয়েছে");
            load();
        } catch (e) {
            showToast(e.message, "error");
        }
    };

    const selectedMember = members.find(m => String(m.id) === String(form.memberId));

    return (
        <div>
            <Toast toast={toast} />

            <PageHeader title="হিসাব ব্যবস্থাপনা">
                <Btn icon="add" variant="primary" onClick={() => openAdd("collection")}>
                    মাসিক চাঁদা কালেকশন
                </Btn>
                <Btn icon="add" variant="ghost" onClick={() => openAdd("general")}>
                    সাধারণ এন্ট্রি
                </Btn>
            </PageHeader>

            <StatsGrid>
                <StatCard label="মোট আয়"
                          value={fmtMoney(summary.income)}
                          icon="money_in" color="var(--success)" />
                <StatCard label="মোট ব্যয়"
                          value={fmtMoney(summary.expense)}
                          icon="money_out" color="var(--danger)" />
                <StatCard label="নিট ব্যালেন্স"
                          value={fmtMoney(summary.balance)}
                          icon="accounts"
                          color={summary.balance >= 0 ? "var(--gold)" : "var(--danger)"} />
                <StatCard label="মোট এন্ট্রি"
                          value={data.length}
                          icon="trend_up" color="var(--primary)" />
            </StatsGrid>

            <FilterTabs
                value={filter}
                onChange={setFilter}
                options={[
                    { value:"all",     label:"সকল"  },
                    { value:"income",  label:"আয়"   },
                    { value:"expense", label:"ব্যয়" },
                ]}
            />

            <Table
                loading={loading}
                cols={[
                    { key:"date", label:"তারিখ",
                        render: r => fmtDate(r.date) },
                    { key:"txType", label:"ধরন",
                        render: r => (
                            <Badge color={r.txType === "income" ? "var(--success)" : "var(--danger)"}>
                                {r.txType === "income" ? "আয়" : "ব্যয়"}
                            </Badge>
                        )
                    },
                    { key:"memberName", label:"সদস্য",
                        render: r => r.memberName || "—" },
                    { key:"collectionMonth", label:"মাস/বছর",
                        render: r => r.collectionMonth
                            ? `${monthLabel(r.collectionMonth)} ${r.collectionYear || ""}`
                            : "—"
                    },
                    { key:"bankName", label:"ব্যাংক",
                        render: r => r.bankName
                            ? `${r.bankName} (${r.accountNumber || ""})`
                            : "—"
                    },
                    { key:"category",    label:"খাত"    },
                    { key:"description", label:"বিবরণ"  },
                    { key:"amount", label:"পরিমাণ",
                        render: r => (
                            <span style={{
                                fontWeight:700,
                                color: r.txType === "income" ? "var(--success)" : "var(--danger)"
                            }}>
                {r.txType === "income" ? "+" : "-"}{fmtMoney(r.amount)}
              </span>
                        )
                    },
                ]}
                rows={data}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            {modal && (
                <Modal
                    title={
                        form.id
                            ? "এন্ট্রি সম্পাদনা"
                            : entryType === "collection"
                                ? "মাসিক চাঁদা কালেকশন এন্ট্রি"
                                : "সাধারণ আয়/ব্যয় এন্ট্রি"
                    }
                    onClose={() => setModal(false)}
                    wide
                >
                    <form onSubmit={handleSubmit}>

                        {/* ══ COLLECTION FORM ══ */}
                        {entryType === "collection" && (
                            <>
                                <SectionTitle>সদস্য ও কালেকশন তথ্য</SectionTitle>
                                <FormGrid>
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

                                    <Field label="পরিমাণ (৳)" required half>
                                        <Input
                                            type="number" step="0.01"
                                            value={form.amount}
                                            onChange={set("amount")}
                                            placeholder="0.00"
                                        />
                                    </Field>

                                    <Field label="কালেকশন মাস" required half>
                                        <Select value={form.collectionMonth} onChange={handleMonthChange}>
                                            {MONTHS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="কালেকশন বছর" required half>
                                        <Select value={form.collectionYear} onChange={handleYearChange}>
                                            {YEARS.map(y => (
                                                <option key={y} value={String(y)}>{y}</option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="ব্যাংক অ্যাকাউন্ট" half>
                                        <Select value={form.bankAccountId} onChange={set("bankAccountId")}>
                                            <option value="">— নগদ / ব্যাংক বেছে নিন —</option>
                                            {banks.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.bank_name} — {b.account_name} ({b.account_number})
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="তারিখ" half>
                                        <Input type="date" value={form.date} onChange={set("date")} />
                                    </Field>

                                    <Field label="বিবরণ" required>
                                        <Input
                                            value={form.description}
                                            onChange={set("description")}
                                            placeholder="বিবরণ লিখুন"
                                        />
                                    </Field>

                                    <Field label="মন্তব্য">
                                        <Textarea value={form.notes || ""} onChange={set("notes")} />
                                    </Field>
                                </FormGrid>

                                {selectedMember && (
                                    <div style={{
                                        background:"var(--bg)",
                                        border:"1px solid var(--border)",
                                        borderRadius:10, padding:"12px 16px",
                                        marginBottom:"1rem",
                                    }}>
                                        <div style={{
                                            fontSize:"0.72rem", fontWeight:700,
                                            color:"var(--muted)", textTransform:"uppercase",
                                            marginBottom:6,
                                        }}>
                                            প্রিভিউ
                                        </div>
                                        <div style={{
                                            display:"flex", gap:"1.5rem",
                                            flexWrap:"wrap", fontSize:"0.875rem",
                                        }}>
                                            <span>👤 <strong>{selectedMember.name}</strong></span>
                                            <span>📅 {monthLabel(form.collectionMonth)} {form.collectionYear}</span>
                                            <span style={{ color:"var(--success)", fontWeight:700 }}>
                        ৳ {Number(form.amount || 0).toLocaleString("bn-BD")}
                      </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ══ GENERAL FORM ══ */}
                        {entryType === "general" && (
                            <>
                                <SectionTitle>লেনদেনের তথ্য</SectionTitle>
                                <FormGrid>
                                    <Field label="ধরন" half>
                                        <Select
                                            value={form.type}
                                            onChange={e =>
                                                setForm(p => ({ ...p, type: e.target.value, category: "" }))
                                            }
                                        >
                                            <option value="income">আয়</option>
                                            <option value="expense">ব্যয়</option>
                                        </Select>
                                    </Field>

                                    <Field label="তারিখ" half>
                                        <Input type="date" value={form.date} onChange={set("date")} />
                                    </Field>

                                    <Field label="খাত" half>
                                        <Select value={form.category} onChange={set("category")}>
                                            <option value="">— বেছে নিন —</option>
                                            {(form.type === "income" ? INC_CATS : EXP_CATS).map(c => (
                                                <option key={c}>{c}</option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="পরিমাণ (৳)" required half>
                                        <Input
                                            type="number" step="0.01"
                                            value={form.amount}
                                            onChange={set("amount")}
                                            placeholder="0.00"
                                        />
                                    </Field>

                                    <Field label="ব্যাংক অ্যাকাউন্ট" half>
                                        <Select value={form.bankAccountId} onChange={set("bankAccountId")}>
                                            <option value="">— নগদ / ব্যাংক বেছে নিন —</option>
                                            {banks.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.bankName} — {b.accountName} ({b.accountNumber})
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="সদস্য (ঐচ্ছিক)" half>
                                        <Select value={form.memberId} onChange={set("memberId")}>
                                            <option value="">— সদস্য (যদি প্রযোজ্য) —</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="বিবরণ" required>
                                        <Input
                                            value={form.description}
                                            onChange={set("description")}
                                            placeholder="লেনদেনের বিবরণ লিখুন"
                                        />
                                    </Field>

                                    <Field label="মন্তব্য">
                                        <Textarea value={form.notes || ""} onChange={set("notes")} />
                                    </Field>
                                </FormGrid>
                            </>
                        )}

                        <FormActions onCancel={() => setModal(false)} saving={saving} />
                    </form>
                </Modal>
            )}
        </div>
    );
}