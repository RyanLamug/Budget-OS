import { useState, useRef, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ── Tax rules per brand (Philippines VAT context) ── */
// RA 12023 - VAT on Digital Services effective Jan 1 2025 = 12%
// Local PH services = 12% VAT
// Some platforms already bundle VAT in displayed price (inclusive)
const TAX_RULES = {
  "Claude":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "ChatGPT":      { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Gemini":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Midjourney":   { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Perplexity":   { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Cursor":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "GitHub":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Notion":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Figma":        { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Adobe CC":     { rate: 0.12, label: "VAT 12%", inclusive: true  }, // Adobe includes tax in PH billing
  "Canva":        { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Runway":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "ElevenLabs":   { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Suno":         { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Freepik":      { rate: 0.12, label: "VAT 12%", inclusive: true  }, // Freepik adds VAT at checkout
  "CapCut":       { rate: 0,    label: "No VAT",  inclusive: false },
  "DaVinci":      { rate: 0,    label: "No VAT",  inclusive: false }, // One-time, no sub VAT
  "Kling":        { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Framer":       { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Slack":        { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Dropbox":      { rate: 0.12, label: "VAT 12%", inclusive: false },
  "Netflix":      { rate: 0.12, label: "VAT 12%", inclusive: true  }, // Netflix PH includes VAT
  "Spotify":      { rate: 0.12, label: "VAT 12%", inclusive: true  }, // Spotify PH includes VAT
  "YouTube":      { rate: 0.12, label: "VAT 12%", inclusive: true  }, // Google PH includes VAT
};
const DEFAULT_TAX = { rate: 0.12, label: "VAT 12%", inclusive: false };

const BRANDS = [
  { name: "Claude",        domain: "anthropic.com",        category: "AI",            defaultCurrency: "USD" },
  { name: "ChatGPT",       domain: "openai.com",           category: "AI",            defaultCurrency: "USD" },
  { name: "Gemini",        domain: "gemini.google.com",    category: "AI",            defaultCurrency: "USD" },
  { name: "Midjourney",    domain: "midjourney.com",       category: "AI",            defaultCurrency: "USD" },
  { name: "Perplexity",    domain: "perplexity.ai",        category: "AI",            defaultCurrency: "USD" },
  { name: "Cursor",        domain: "cursor.com",           category: "Dev",           defaultCurrency: "USD" },
  { name: "GitHub",        domain: "github.com",           category: "Dev",           defaultCurrency: "USD" },
  { name: "Notion",        domain: "notion.so",            category: "Productivity",  defaultCurrency: "USD" },
  { name: "Figma",         domain: "figma.com",            category: "Design",        defaultCurrency: "USD" },
  { name: "Adobe CC",      domain: "adobe.com",            category: "Design",        defaultCurrency: "USD" },
  { name: "Canva",         domain: "canva.com",            category: "Design",        defaultCurrency: "USD" },
  { name: "Runway",        domain: "runwayml.com",         category: "AI",            defaultCurrency: "USD" },
  { name: "ElevenLabs",    domain: "elevenlabs.io",        category: "AI",            defaultCurrency: "USD" },
  { name: "Suno",          domain: "suno.com",             category: "AI",            defaultCurrency: "USD" },
  { name: "Freepik",       domain: "freepik.com",          category: "Design",        defaultCurrency: "USD" },
  { name: "CapCut",        domain: "capcut.com",           category: "Video",         defaultCurrency: "PHP" },
  { name: "DaVinci",       domain: "blackmagicdesign.com", category: "Video",         defaultCurrency: "USD" },
  { name: "Kling",         domain: "klingai.com",          category: "AI",            defaultCurrency: "USD" },
  { name: "Framer",        domain: "framer.com",           category: "Design",        defaultCurrency: "USD" },
  { name: "Slack",         domain: "slack.com",            category: "Productivity",  defaultCurrency: "USD" },
  { name: "Dropbox",       domain: "dropbox.com",          category: "Productivity",  defaultCurrency: "USD" },
  { name: "Netflix",       domain: "netflix.com",          category: "Entertainment", defaultCurrency: "PHP" },
  { name: "Spotify",       domain: "spotify.com",          category: "Entertainment", defaultCurrency: "PHP" },
  { name: "YouTube",       domain: "youtube.com",          category: "Entertainment", defaultCurrency: "PHP" },
];

const EXPENSE_CATS = ["Housing","Food","Transport","Utilities","Health","Entertainment","Other"];
const PIE_GRAYS = ["#000","#1C1C1E","#3A3A3C","#545456","#636366","#8E8E93","#AEAEB2","#C7C7CC"];
const TABS = [["input","Input"],["dashboard","Dashboard"],["runway","Runway"]];
const SF = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`;

/* ── Helpers ── */
const fmtPHP = (v) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(v || 0);

const fmtUSD = (v) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(v || 0);

function toPHP(amount, currency, rate) {
  const base = parseFloat(amount) || 0;
  return currency === "USD" ? base * rate : base;
}

function taxedTotal(amountPHP, taxRule) {
  if (!taxRule || taxRule.rate === 0) return { base: amountPHP, tax: 0, total: amountPHP };
  if (taxRule.inclusive) {
    const base = amountPHP / (1 + taxRule.rate);
    return { base, tax: amountPHP - base, total: amountPHP };
  }
  const tax = amountPHP * taxRule.rate;
  return { base: amountPHP, tax, total: amountPHP + tax };
}

/* ── Animated number ── */
const AnimatedNum = ({ value, prefix = "₱" }) => {
  const [disp, setDisp] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const from = disp;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 550, 1);
      setDisp(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span>{prefix}{disp.toLocaleString("en-PH")}</span>;
};

export default function BudgetOS() {
  const [tab, setTab] = useState("input");

  /* Exchange rate */
  const [usdRate, setUsdRate] = useState(57.5); // fallback
  const [rateStatus, setRateStatus] = useState("loading"); // loading | live | fallback

  /* Income */
  const [salary, setSalary] = useState({ amount: "", currency: "PHP" });
  const [extras, setExtras] = useState([]);
  const [newExtra, setNewExtra] = useState({ label: "", amount: "", currency: "PHP" });
  const [showExtra, setShowExtra] = useState(false);

  /* Goal */
  const [savingsGoal, setSavingsGoal] = useState("");

  /* General expenses */
  const [expenses, setExpenses] = useState(
    EXPENSE_CATS.reduce((a, c) => ({ ...a, [c]: { amount: "", currency: "PHP" } }), {})
  );

  /* Subscriptions */
  const [subs, setSubs] = useState([]);
  const [showSubPicker, setShowSubPicker] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [customSub, setCustomSub] = useState({ name: "", domain: "", amount: "", currency: "USD", type: "Expense" });
  const [showCustomSub, setShowCustomSub] = useState(false);

  /* Runway */
  const [runwayMonths, setRunwayMonths] = useState(6);
  const [monthlySaveTarget, setMonthlySaveTarget] = useState(15000);
  const [history, setHistory] = useState([]);

  /* Fetch live rate */
  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates?.PHP) {
          setUsdRate(d.rates.PHP);
          setRateStatus("live");
        } else { setRateStatus("fallback"); }
      })
      .catch(() => setRateStatus("fallback"));
  }, []);

  /* Derived */
  const salaryPHP   = toPHP(salary.amount, salary.currency, usdRate);
  const extrasPHP   = extras.reduce((s, e) => s + toPHP(e.amount, e.currency, usdRate), 0);
  const totalIncome = salaryPHP + extrasPHP;

  const genExpensesPHP = Object.values(expenses)
    .reduce((s, e) => s + toPHP(e.amount, e.currency, usdRate), 0);

  const subRows = subs.map((s) => {
    const basePHP  = toPHP(s.amount, s.currency, usdRate);
    const taxRule  = TAX_RULES[s.name] || (s.amount ? DEFAULT_TAX : { rate: 0, label: "No VAT", inclusive: false });
    const taxed    = taxedTotal(basePHP, taxRule);
    return { ...s, basePHP, taxRule, taxed };
  });

  const subTotal     = subRows.reduce((s, x) => s + x.taxed.total, 0);
  const totalTax     = subRows.reduce((s, x) => s + x.taxed.tax, 0);
  const totalExpPHP  = genExpensesPHP + subTotal;
  const remaining    = totalIncome - totalExpPHP;
  const goal         = parseFloat(savingsGoal || 0);
  const savePct      = goal > 0 ? Math.min(100, (Math.max(0, remaining) / goal) * 100) : 0;

  const investTotal  = subRows.filter((s) => s.type === "Investment")
    .reduce((s, x) => s + x.taxed.total, 0);
  const subExpTotal  = subRows.filter((s) => s.type === "Expense")
    .reduce((s, x) => s + x.taxed.total, 0);

  /* Runway */
  const monthlyBurn  = (genExpensesPHP || 17500) + (investTotal) + 3000;
  const runwayTarget = monthlyBurn * runwayMonths;
  const monthsToGoal = monthlySaveTarget > 0 ? Math.ceil(runwayTarget / monthlySaveTarget) : null;
  const arrivalDate  = () => {
    if (!monthsToGoal) return null;
    const d = new Date(); d.setMonth(d.getMonth() + monthsToGoal);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const filteredBrands = BRANDS.filter(
    (b) => !subs.find((s) => s.name === b.name) &&
      b.name.toLowerCase().includes(subSearch.toLowerCase())
  );

  const pieData = [
    ...EXPENSE_CATS.filter((c) => parseFloat(expenses[c].amount) > 0)
      .map((c) => ({ name: c, value: toPHP(expenses[c].amount, expenses[c].currency, usdRate) })),
    ...subRows.filter((s) => s.taxed.total > 0).map((s) => ({ name: s.name, value: s.taxed.total })),
  ];

  function addExtra() {
    if (!newExtra.label || !newExtra.amount) return;
    setExtras([...extras, { ...newExtra }]);
    setNewExtra({ label: "", amount: "", currency: "PHP" });
    setShowExtra(false);
  }
  function addBrandSub(b) {
    setSubs([...subs, { ...b, amount: "", currency: b.defaultCurrency || "USD", type: "Expense" }]);
    setShowSubPicker(false); setSubSearch("");
  }
  function addCustomSub() {
    if (!customSub.name || !customSub.amount) return;
    setSubs([...subs, { ...customSub }]);
    setCustomSub({ name: "", domain: "", amount: "", currency: "USD", type: "Expense" });
    setShowCustomSub(false);
  }
  function updateSub(i, k, v) { const u = [...subs]; u[i][k] = v; setSubs(u); }
  function removeSub(i) { setSubs(subs.filter((_, idx) => idx !== i)); }
  function saveMonth() {
    const m = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    setHistory((h) => [
      { month: m, income: totalIncome, spent: totalExpPHP, saved: Math.max(0, remaining), goal },
      ...h,
    ]);
    setTab("dashboard");
  }

  const ringR = 60, ringC = 2 * Math.PI * ringR, ringDash = (savePct / 100) * ringC;

  return (
    <>
      <style>{`
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:#fff;}
        input[type=number]{-moz-appearance:textfield;}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp 0.36s ease both;}
        .fu1{animation-delay:.04s}.fu2{animation-delay:.08s}.fu3{animation-delay:.12s}
        .fu4{animation-delay:.16s}.fu5{animation-delay:.20s}.fu6{animation-delay:.24s}
        .row:hover{background:#f5f5f7;border-radius:10px;}
        .tab-pill{transition:background .16s,color .16s;cursor:pointer;}
        .tab-pill.on{background:#000!important;color:#fff!important;}
        .tab-pill:hover:not(.on){background:#e8e8e8!important;}
        .cta{transition:opacity .18s,transform .1s;cursor:pointer;}
        .cta:hover{opacity:.82;}
        .cta:active{transform:scale(.98);}
        .ghost:hover{background:#f0f0f0!important;}
        .card-h{transition:box-shadow .2s,transform .18s;}
        .card-h:hover{box-shadow:0 6px 24px rgba(0,0,0,.08)!important;transform:translateY(-1px);}
        .ring-arc{transition:stroke-dasharray .85s cubic-bezier(.34,1.56,.64,1);}
        .brand-chip{cursor:pointer;transition:all .13s;border:1px solid #e0e0e0;border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;background:#fff;}
        .brand-chip:hover{background:#f5f5f7;border-color:#bbb;}
        .type-toggle{display:flex;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;}
        .type-opt{padding:4px 10px;font-size:11px;font-weight:500;cursor:pointer;border:none;background:#fff;color:#6e6e73;transition:background .13s,color .13s;}
        .type-opt.on{background:#000;color:#fff;}
        .cur-toggle{display:flex;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;}
        .cur-opt{padding:5px 9px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:#fff;color:#aeaeb2;transition:background .13s,color .13s;font-family:inherit;}
        .cur-opt.on{background:#1C1C1E;color:#fff;}
        .seg-btn{transition:all .15s;cursor:pointer;}
        .seg-btn.on{background:#000;color:#fff;}
        input:focus{outline:none;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:3px;}
        .tax-badge{display:inline-flex;align-items:center;gap:3px;background:#f5f5f7;border-radius:6px;padding:2px 7px;font-size:10px;font-weight:600;color:#6e6e73;}
        .tax-badge.active{background:#fff3cd;color:#856404;}
        .tax-badge.zero{background:#f5f5f7;color:#aeaeb2;}
        .remove-btn{opacity:0;transition:opacity .13s;}
        .sub-row-wrap:hover .remove-btn{opacity:1;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#fff", fontFamily: SF, color: "#000" }}>

        {/* Header */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100, height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>Budget</span>
          <div style={{ display: "flex", gap: 2, background: "#f0f0f0", padding: 3, borderRadius: 11 }}>
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`tab-pill${tab === k ? " on" : ""}`}
                style={{ padding: "5px 13px", border: "none", borderRadius: 8,
                  background: "transparent", color: "#6e6e73",
                  fontSize: 13, fontWeight: 500, fontFamily: SF }}>{l}</button>
            ))}
          </div>
          {/* Rate pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6,
            background: "#f5f5f7", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%",
              background: rateStatus === "live" ? "#34c759" : "#ff9500" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#3a3a3c" }}>
              $1 = ₱{usdRate.toFixed(2)}
            </span>
          </div>
        </header>

        <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px 100px" }}>

          {/* ─── INPUT ─── */}
          {tab === "input" && (
            <div key="in">
              <div className="fu" style={{ marginBottom: 40 }}>
                <p style={lbl}>{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</p>
                <h1 style={h1}>Track your money.</h1>
                <p style={{ fontSize: 13, color: "#aeaeb2", marginTop: 8 }}>
                  USD auto-converts at live rate · VAT applied per RA 12023
                </p>
              </div>

              {/* Income */}
              <Block title="Income" cls="fu fu1">
                <DualRow label="Monthly Salary"
                  amount={salary.amount} currency={salary.currency} rate={usdRate}
                  onAmount={(v) => setSalary({ ...salary, amount: v })}
                  onCurrency={(c) => setSalary({ ...salary, currency: c })} />
                {extras.map((e, i) => (
                  <DualRow key={i} label={e.label} sub="Extra"
                    amount={e.amount} currency={e.currency} rate={usdRate}
                    readOnly indent />
                ))}
                {showExtra ? (
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input placeholder="Label" value={newExtra.label}
                        onChange={(e) => setNewExtra({ ...newExtra, label: e.target.value })}
                        style={tiS} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <CurrencyToggle value={newExtra.currency}
                        onChange={(c) => setNewExtra({ ...newExtra, currency: c })} />
                      <AmountInput value={newExtra.amount} currency={newExtra.currency}
                        onChange={(v) => setNewExtra({ ...newExtra, amount: v })} />
                      <Btn onClick={addExtra}>Add</Btn>
                      <Btn onClick={() => setShowExtra(false)} outline>✕</Btn>
                    </div>
                  </div>
                ) : (
                  <DashedBtn onClick={() => setShowExtra(true)} label="+ Add income source" />
                )}
              </Block>

              {/* Savings Goal */}
              <Block title="Monthly Savings Goal" cls="fu fu2">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 4px", borderBottom: "1px solid #f5f5f7" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Target to save</span>
                  <AmountInput value={savingsGoal} currency="PHP" onChange={setSavingsGoal} large />
                </div>
                <div style={{ display: "flex", gap: 8, padding: "10px 4px" }}>
                  {[15000, 18000].map((v) => (
                    <button key={v} onClick={() => setSavingsGoal(String(v))}
                      className={`seg-btn${savingsGoal == v ? " on" : ""}`}
                      style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #d0d0d0",
                        background: savingsGoal == v ? "#000" : "transparent",
                        color: savingsGoal == v ? "#fff" : "#6e6e73",
                        fontSize: 13, fontWeight: 500, fontFamily: SF }}>
                      {fmtPHP(v)}/mo
                    </button>
                  ))}
                </div>
              </Block>

              {/* General Expenses */}
              <Block title="General Expenses" cls="fu fu3">
                {EXPENSE_CATS.map((c) => (
                  <DualRow key={c} label={c}
                    amount={expenses[c].amount} currency={expenses[c].currency} rate={usdRate}
                    onAmount={(v) => setExpenses({ ...expenses, [c]: { ...expenses[c], amount: v } })}
                    onCurrency={(cur) => setExpenses({ ...expenses, [c]: { ...expenses[c], currency: cur } })} />
                ))}
              </Block>

              {/* Subscriptions */}
              <div className="fu fu4" style={{ marginBottom: 20 }}>
                <p style={{ ...lbl, marginBottom: 8 }}>Subscriptions & Plans</p>
                {totalTax > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8,
                    background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10,
                    padding: "8px 12px", marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>⚠</span>
                    <span style={{ fontSize: 12, color: "#7a5c00", fontWeight: 500 }}>
                      {fmtPHP(totalTax)} total VAT applied across your subscriptions (RA 12023)
                    </span>
                  </div>
                )}
                <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)", padding: "8px 16px 14px" }}>

                  {subs.length === 0 && !showSubPicker && !showCustomSub && (
                    <p style={{ fontSize: 13, color: "#c7c7cc", padding: "12px 0 6px", textAlign: "center" }}>
                      No subscriptions yet.
                    </p>
                  )}

                  {subRows.map((s, i) => (
                    <div key={i} className="sub-row-wrap" style={{ padding: "12px 0",
                      borderBottom: "1px solid #f5f5f7" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <BrandLogo domain={s.domain} name={s.name} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                            <div className="type-toggle">
                              {["Expense","Investment"].map((t) => (
                                <button key={t} onClick={() => updateSub(i, "type", t)}
                                  className={`type-opt${s.type === t ? " on" : ""}`}
                                  style={{ fontFamily: SF }}>{t}</button>
                              ))}
                            </div>
                            {/* Tax badge */}
                            {s.taxRule && (
                              <span className={`tax-badge${s.taxRule.rate > 0 ? " active" : " zero"}`}>
                                {s.taxRule.label}
                                {s.taxRule.inclusive && s.taxRule.rate > 0 ? " incl." : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => removeSub(i)} className="remove-btn ghost"
                          style={{ background: "transparent", border: "none", color: "#aeaeb2",
                            fontSize: 18, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}>×</button>
                      </div>

                      {/* Price row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8,
                        paddingLeft: 44, flexWrap: "wrap" }}>
                        <CurrencyToggle value={s.currency}
                          onChange={(c) => updateSub(i, "currency", c)} />
                        <AmountInput value={s.amount} currency={s.currency}
                          onChange={(v) => updateSub(i, "amount", v)} />

                        {parseFloat(s.amount) > 0 && (
                          <div style={{ fontSize: 11, color: "#6e6e73", lineHeight: 1.6 }}>
                            {s.currency === "USD" && (
                              <div>= {fmtPHP(s.basePHP)} PHP</div>
                            )}
                            {s.taxed.tax > 0 && (
                              <div style={{ color: "#856404" }}>
                                +{fmtPHP(s.taxed.tax)} VAT
                                {s.taxRule.inclusive ? " (incl.)" : ""}
                              </div>
                            )}
                            <div style={{ fontWeight: 700, color: "#000" }}>
                              Total: {fmtPHP(s.taxed.total)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {showSubPicker && (
                    <div style={{ marginTop: 8, padding: 12, background: "#f5f5f7", borderRadius: 12 }}>
                      <input placeholder="Search apps..." value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        style={{ ...tiS, width: "100%", marginBottom: 10 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
                        maxHeight: 260, overflowY: "auto" }}>
                        {filteredBrands.map((b) => (
                          <div key={b.name} className="brand-chip" onClick={() => addBrandSub(b)}>
                            <BrandLogo domain={b.domain} name={b.name} size={28} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                              <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                                <span style={{ fontSize: 10, color: "#aeaeb2" }}>{b.category}</span>
                                <span style={{ fontSize: 10, color: "#856404", fontWeight: 600 }}>
                                  {TAX_RULES[b.name]?.label || "VAT 12%"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <Btn onClick={() => { setShowSubPicker(false); setShowCustomSub(true); }} outline>+ Custom</Btn>
                        <Btn onClick={() => { setShowSubPicker(false); setSubSearch(""); }} outline>Close</Btn>
                      </div>
                    </div>
                  )}

                  {showCustomSub && (
                    <div style={{ marginTop: 8, padding: 12, background: "#f5f5f7", borderRadius: 12 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input placeholder="App name" value={customSub.name}
                          onChange={(e) => setCustomSub({ ...customSub, name: e.target.value })}
                          style={{ ...tiS, flex: 1 }} />
                        <input placeholder="domain.com" value={customSub.domain}
                          onChange={(e) => setCustomSub({ ...customSub, domain: e.target.value })}
                          style={{ ...tiS, flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <CurrencyToggle value={customSub.currency}
                          onChange={(c) => setCustomSub({ ...customSub, currency: c })} />
                        <AmountInput value={customSub.amount} currency={customSub.currency}
                          onChange={(v) => setCustomSub({ ...customSub, amount: v })} />
                        <div className="type-toggle">
                          {["Expense","Investment"].map((t) => (
                            <button key={t} onClick={() => setCustomSub({ ...customSub, type: t })}
                              className={`type-opt${customSub.type === t ? " on" : ""}`}
                              style={{ fontFamily: SF }}>{t}</button>
                          ))}
                        </div>
                        <Btn onClick={addCustomSub}>Add</Btn>
                        <Btn onClick={() => setShowCustomSub(false)} outline>✕</Btn>
                      </div>
                    </div>
                  )}

                  {!showSubPicker && !showCustomSub && (
                    <DashedBtn onClick={() => setShowSubPicker(true)} label="+ Add subscription or plan" />
                  )}
                </div>

                {subs.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Chip label="Expenses" value={fmtPHP(subExpTotal)} />
                    <Chip label="Investments" value={fmtPHP(investTotal)} color="#34c759" />
                    <Chip label="VAT paid" value={fmtPHP(totalTax)} color="#856404" />
                    <Chip label="Total" value={fmtPHP(subTotal)} bold />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="fu fu5" style={{ background: "#f5f5f7", borderRadius: 16,
                padding: "16px 20px", marginBottom: 14,
                display: "flex", justifyContent: "space-between" }}>
                {[
                  { l: "Income",    v: fmtPHP(totalIncome),   c: "#000" },
                  { l: "Expenses",  v: fmtPHP(totalExpPHP),   c: totalExpPHP > totalIncome ? "#ff3b30" : "#000" },
                  { l: "Remaining", v: fmtPHP(remaining),     c: remaining < 0 ? "#ff3b30" : "#34c759" },
                ].map((s) => (
                  <div key={s.l}>
                    <div style={{ fontSize: 10, color: "#aeaeb2", fontWeight: 600,
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{s.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.c, letterSpacing: "-0.02em" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <button onClick={saveMonth} className="cta fu fu6"
                style={{ width: "100%", padding: "15px", background: "#000", color: "#fff",
                  border: "none", borderRadius: 14, fontSize: 15, fontWeight: 600,
                  cursor: "pointer", fontFamily: SF }}>
                Save & View Dashboard
              </button>
            </div>
          )}

          {/* ─── DASHBOARD ─── */}
          {tab === "dashboard" && (
            <div key="dash">
              <div className="fu" style={{ marginBottom: 40 }}>
                <p style={lbl}>Overview</p>
                <h1 style={h1}>Your snapshot.</h1>
              </div>

              <div className="fu fu1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { l: "Income",    v: totalIncome,   c: "#000" },
                  { l: "Spent",     v: totalExpPHP,   c: totalExpPHP > totalIncome ? "#ff3b30" : "#000" },
                  { l: "Remaining", v: remaining,     c: remaining < 0 ? "#ff3b30" : "#000" },
                ].map((s) => (
                  <div key={s.l} className="card-h" style={{ background: "#f5f5f7", borderRadius: 14,
                    padding: "15px 12px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                    <div style={{ fontSize: 10, color: "#aeaeb2", fontWeight: 600,
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{s.l}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: s.c, letterSpacing: "-0.03em" }}>
                      <AnimatedNum value={s.v} />
                    </div>
                  </div>
                ))}
              </div>

              {/* VAT summary card */}
              {totalTax > 0 && (
                <div className="fu fu1" style={{ background: "#fff8e1", border: "1px solid #ffe082",
                  borderRadius: 14, padding: "14px 16px", marginBottom: 12,
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#7a5c00",
                      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>VAT Paid (RA 12023)</div>
                    <div style={{ fontSize: 13, color: "#856404" }}>
                      Across {subRows.filter((s) => s.taxed.tax > 0).length} subscription{subRows.filter((s) => s.taxed.tax > 0).length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#856404", letterSpacing: "-0.02em" }}>
                    {fmtPHP(totalTax)}
                  </div>
                </div>
              )}

              {/* Savings ring */}
              <div className="fu fu2 card-h" style={cardS}>
                <p style={sl}>Savings Progress</p>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <svg width={148} height={148} viewBox="0 0 148 148" style={{ flexShrink: 0 }}>
                    <circle cx={74} cy={74} r={ringR} fill="none" stroke="#f0f0f0" strokeWidth={9} />
                    <circle cx={74} cy={74} r={ringR} fill="none"
                      stroke={savePct >= 100 ? "#34c759" : "#000"} strokeWidth={9}
                      strokeLinecap="round" strokeDasharray={`${ringDash} ${ringC}`}
                      strokeDashoffset={ringC / 4} className="ring-arc" />
                    <text x={74} y={70} textAnchor="middle" fill="#000" fontSize={26}
                      fontFamily={SF} fontWeight="700">{Math.round(savePct)}%</text>
                    <text x={74} y={87} textAnchor="middle" fill="#aeaeb2" fontSize={11}
                      fontFamily={SF} fontWeight="500">of goal</text>
                  </svg>
                  <div style={{ flex: 1 }}>
                    {[
                      { l: "Saved", v: fmtPHP(Math.max(0, remaining)), c: "#34c759" },
                      { l: "Goal",  v: fmtPHP(goal), c: "#000" },
                      { l: "Gap",   v: fmtPHP(Math.max(0, goal - Math.max(0, remaining))),
                        c: Math.max(0, goal - Math.max(0, remaining)) === 0 ? "#34c759" : "#ff9500" },
                    ].map((r, i) => (
                      <div key={r.l} style={{ padding: "10px 0", borderBottom: i < 2 ? "1px solid #f5f5f7" : "none" }}>
                        <div style={{ fontSize: 10, color: "#aeaeb2", fontWeight: 600,
                          letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>{r.l}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: r.c, letterSpacing: "-0.02em" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subs table */}
              {subRows.length > 0 && (
                <div className="fu fu3 card-h" style={cardS}>
                  <p style={sl}>Subscriptions & Plans</p>
                  {subRows.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 0", borderBottom: "1px solid #f5f5f7" }}>
                      <BrandLogo domain={s.domain} name={s.name} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 500,
                            color: s.type === "Investment" ? "#34c759" : "#aeaeb2" }}>{s.type}</span>
                          {s.taxed.tax > 0 && (
                            <span className="tax-badge active">+{fmtPHP(s.taxed.tax)} VAT</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {s.currency === "USD" && parseFloat(s.amount) > 0 && (
                          <div style={{ fontSize: 10, color: "#aeaeb2" }}>{fmtUSD(s.amount)}</div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {parseFloat(s.taxed.total) > 0 ? fmtPHP(s.taxed.total) : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <Chip label="Expenses" value={fmtPHP(subExpTotal)} />
                    <Chip label="Investments" value={fmtPHP(investTotal)} color="#34c759" />
                    <Chip label="VAT" value={fmtPHP(totalTax)} color="#856404" />
                    <Chip label="Total" value={fmtPHP(subTotal)} bold />
                  </div>
                </div>
              )}

              {/* Pie */}
              {pieData.length > 0 && (
                <div className="fu fu4 card-h" style={cardS}>
                  <p style={sl}>Spending Breakdown</p>
                  <ResponsiveContainer width="100%" height={196}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={84}
                        paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_GRAYS[i % PIE_GRAYS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [fmtPHP(v)]}
                        contentStyle={{ background: "#fff", border: "1px solid #e0e0e0",
                          borderRadius: 10, fontSize: 13, fontFamily: SF }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 0", borderBottom: "1px solid #f5f5f7" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2,
                          background: PIE_GRAYS[i % PIE_GRAYS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#6e6e73", flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtPHP(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              <div className="fu fu5 card-h" style={cardS}>
                <p style={sl}>Insights</p>
                {totalIncome === 0 && <Ins icon="○" text="Add your income in the Input tab." />}
                {totalExpPHP > totalIncome && totalIncome > 0 && (
                  <Ins icon="↑" text={`Overspending by ${fmtPHP(totalExpPHP - totalIncome)}.`} color="#ff3b30" />
                )}
                {remaining >= goal && goal > 0 && (
                  <Ins icon="✓" text={`Savings goal hit. ${fmtPHP(remaining - goal)} ahead.`} color="#34c759" />
                )}
                {remaining < goal && remaining >= 0 && goal > 0 && (
                  <Ins icon="→" text={`Cut ${fmtPHP(goal - remaining)} more to hit your savings goal.`} color="#ff9500" />
                )}
                {totalTax > 0 && (
                  <Ins icon="◈" text={`${fmtPHP(totalTax)}/mo going to VAT. Consider pricing this into your rates.`} color="#856404" />
                )}
                {totalExpPHP > 0 && totalIncome > 0 && (
                  <Ins icon="◎" text={`Spending ${Math.round((totalExpPHP / totalIncome) * 100)}% of income. ${totalExpPHP / totalIncome < 0.7 ? "Healthy." : "Consider reducing."}`} />
                )}
              </div>

              {history.length > 0 && (
                <div className="fu fu6 card-h" style={cardS}>
                  <p style={sl}>History</p>
                  {history.map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between",
                      padding: "12px 0", borderBottom: i < history.length - 1 ? "1px solid #f5f5f7" : "none" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{h.month}</div>
                        <div style={{ fontSize: 12, color: "#aeaeb2", marginTop: 2 }}>Income {fmtPHP(h.income)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700,
                          color: h.saved >= h.goal && h.goal > 0 ? "#34c759" : "#000" }}>
                          Saved {fmtPHP(h.saved)}</div>
                        <div style={{ fontSize: 12, color: "#aeaeb2", marginTop: 2 }}>Goal {fmtPHP(h.goal)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setTab("input")} className="ghost"
                style={{ width: "100%", marginTop: 8, padding: "12px", background: "transparent",
                  border: "1px solid #d0d0d0", borderRadius: 12, color: "#6e6e73",
                  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: SF }}>
                Update this month
              </button>
            </div>
          )}

          {/* ─── RUNWAY ─── */}
          {tab === "runway" && (
            <div key="rwy">
              <div className="fu" style={{ marginBottom: 40 }}>
                <p style={lbl}>Freedom Fund</p>
                <h1 style={h1}>How long until you can quit?</h1>
              </div>

              <div className="fu fu1 card-h" style={cardS}>
                <p style={sl}>Settings</p>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Runway target</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[3,6,9,12].map((m) => (
                      <button key={m} onClick={() => setRunwayMonths(m)}
                        className={`seg-btn${runwayMonths === m ? " on" : ""}`}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 10,
                          border: "1px solid #e0e0e0", fontWeight: 600, fontSize: 14,
                          background: runwayMonths === m ? "#000" : "#fff",
                          color: runwayMonths === m ? "#fff" : "#3a3a3c",
                          cursor: "pointer", fontFamily: SF }}>
                        {m}mo
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Monthly savings rate</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {[10000,15000,18000,20000].map((v) => (
                      <button key={v} onClick={() => setMonthlySaveTarget(v)}
                        className={`seg-btn${monthlySaveTarget === v ? " on" : ""}`}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 10,
                          border: "1px solid #e0e0e0", fontWeight: 500, fontSize: 12,
                          background: monthlySaveTarget === v ? "#000" : "#fff",
                          color: monthlySaveTarget === v ? "#fff" : "#3a3a3c",
                          cursor: "pointer", fontFamily: SF }}>
                        ₱{(v/1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#aeaeb2" }}>Custom:</span>
                    <AmountInput value={monthlySaveTarget} currency="PHP"
                      onChange={(v) => setMonthlySaveTarget(parseFloat(v) || 0)} />
                  </div>
                </div>
              </div>

              <div className="fu fu2 card-h" style={{ ...cardS, background: "#000", borderColor: "#000" }}>
                <p style={{ ...sl, color: "rgba(255,255,255,0.4)" }}>Freedom Fund Target</p>
                <div style={{ fontSize: 42, fontWeight: 700, color: "#fff",
                  letterSpacing: "-0.04em", marginBottom: 6, lineHeight: 1 }}>
                  <AnimatedNum value={runwayTarget} />
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                  {runwayMonths} months × {fmtPHP(monthlyBurn)}/mo burn rate
                </p>
              </div>

              <div className="fu fu3 card-h" style={cardS}>
                <p style={sl}>Savings Timeline</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#6e6e73" }}>Saving {fmtPHP(monthlySaveTarget)}/month</div>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 2 }}>
                      {monthsToGoal ? `${monthsToGoal} months` : "—"}
                    </div>
                  </div>
                  {arrivalDate() && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#aeaeb2", fontWeight: 600,
                        letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Target date</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#34c759" }}>{arrivalDate()}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 90px",
                  gap: "0 12px", fontSize: 12 }}>
                  {["Month","","Balance"].map((h, i) => (
                    <div key={i} style={{ color: "#aeaeb2", fontWeight: 600, padding: "4px 0",
                      letterSpacing: "0.05em", textTransform: "uppercase",
                      textAlign: i === 2 ? "right" : "left" }}>{h}</div>
                  ))}
                  {Array.from({ length: Math.min(monthsToGoal || 12, 24) }, (_, i) => {
                    const saved = (i + 1) * monthlySaveTarget;
                    const pct = Math.min(100, (saved / runwayTarget) * 100);
                    const d = new Date(); d.setMonth(d.getMonth() + i + 1);
                    const reached = saved >= runwayTarget;
                    return [
                      <div key={`m${i}`} style={{ fontSize: 11, color: reached ? "#34c759" : "#6e6e73",
                        padding: "6px 0", borderBottom: "1px solid #f5f5f7", fontWeight: reached ? 700 : 400 }}>
                        {d.toLocaleString("default", { month: "short", year: "2-digit" })}
                      </div>,
                      <div key={`b${i}`} style={{ padding: "6px 0", borderBottom: "1px solid #f5f5f7",
                        display: "flex", alignItems: "center" }}>
                        <div style={{ height: 4, background: "#f0f0f0", borderRadius: 2,
                          overflow: "hidden", flex: 1 }}>
                          <div style={{ height: "100%", borderRadius: 2,
                            background: reached ? "#34c759" : "#000", width: `${pct}%`,
                            transition: "width 0.3s ease" }} />
                        </div>
                      </div>,
                      <div key={`v${i}`} style={{ fontSize: 11, fontWeight: reached ? 700 : 500,
                        color: reached ? "#34c759" : "#3a3a3c", padding: "6px 0",
                        borderBottom: "1px solid #f5f5f7", textAlign: "right" }}>
                        {fmtPHP(Math.min(saved, runwayTarget))}{reached ? " ✓" : ""}
                      </div>
                    ];
                  })}
                </div>
              </div>

              <div className="fu fu4 card-h" style={cardS}>
                <p style={sl}>Monthly Burn Rate</p>
                {[
                  { l: "Living expenses", v: genExpensesPHP || 17500 },
                  { l: "Essential tools", v: investTotal },
                  { l: "Buffer", v: 3000 },
                ].map((r) => (
                  <div key={r.l} style={{ display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid #f5f5f7", fontSize: 14 }}>
                    <span style={{ color: "#3a3a3c" }}>{r.l}</span>
                    <span style={{ fontWeight: 600 }}>{fmtPHP(r.v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between",
                  padding: "12px 0 0", fontSize: 15, fontWeight: 700 }}>
                  <span>Total monthly burn</span>
                  <span>{fmtPHP(monthlyBurn)}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ── Components ── */

function Block({ title, children, cls }) {
  return (
    <div className={cls} style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#aeaeb2",
        textTransform: "uppercase", marginBottom: 8 }}>{title}</p>
      <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,.04)", padding: "4px 16px 10px" }}>
        {children}
      </div>
    </div>
  );
}

function DualRow({ label, sub, amount, currency, rate, onAmount, onCurrency, readOnly, indent }) {
  const php = toPHP(amount, currency, rate);
  return (
    <div className="row" style={{ display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "10px 4px",
      paddingLeft: indent ? 14 : 4, borderBottom: "1px solid #f5f5f7",
      transition: "background .13s", gap: 8 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#c7c7cc", marginTop: 1 }}>{sub}</div>}
        {currency === "USD" && parseFloat(amount) > 0 && (
          <div style={{ fontSize: 11, color: "#aeaeb2", marginTop: 2 }}>= {fmtPHP(php)}</div>
        )}
      </div>
      {!readOnly && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <CurrencyToggle value={currency} onChange={onCurrency} />
          <AmountInput value={amount} currency={currency} onChange={onAmount} />
        </div>
      )}
      {readOnly && (
        <div style={{ fontSize: 14, fontWeight: 600, color: "#6e6e73" }}>{fmtPHP(php)}</div>
      )}
    </div>
  );
}

function CurrencyToggle({ value, onChange }) {
  return (
    <div className="cur-toggle">
      {["PHP","USD"].map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className={`cur-opt${value === c ? " on" : ""}`}>{c}</button>
      ))}
    </div>
  );
}

function AmountInput({ value, currency, onChange, large }) {
  const symbol = currency === "USD" ? "$" : "₱";
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#f5f5f7",
      border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
      <span style={{ padding: "7px 7px 7px 10px", fontSize: 12, color: "#aeaeb2",
        fontWeight: 500, borderRight: "1px solid #e5e5e5" }}>{symbol}</span>
      <input type="number" placeholder="0" value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        style={{ background: "transparent", border: "none", outline: "none",
          color: "#000", fontSize: large ? 16 : 14, fontWeight: large ? 700 : 600,
          padding: "7px 8px", width: large ? 110 : 80,
          textAlign: "right",
          fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` }} />
    </div>
  );
}

function BrandLogo({ domain, name, size = 32 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, overflow: "hidden",
      flexShrink: 0, background: "#f5f5f7", display: "flex", alignItems: "center",
      justifyContent: "center", border: "1px solid #e8e8e8" }}>
      {domain && !err ? (
        <img src={`https://logo.clearbit.com/${domain}`} alt={name} onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        <span style={{ fontSize: size * 0.34, fontWeight: 700, color: "#6e6e73" }}>
          {name?.slice(0,2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function DashedBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="ghost"
      style={{ width: "100%", marginTop: 8, padding: "9px 12px", background: "transparent",
        border: "1px dashed #d0d0d0", borderRadius: 10, color: "#aeaeb2",
        fontSize: 13, cursor: "pointer",
        fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` }}>
      {label}
    </button>
  );
}

function Btn({ children, onClick, outline }) {
  return (
    <button onClick={onClick} className={outline ? "ghost cta" : "cta"}
      style={{ background: outline ? "transparent" : "#000", color: outline ? "#6e6e73" : "#fff",
        border: outline ? "1px solid #d0d0d0" : "none", padding: "7px 14px",
        borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`,
        whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function Chip({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center",
      background: "#f5f5f7", borderRadius: 20, padding: "5px 12px" }}>
      <span style={{ fontSize: 11, color: "#aeaeb2", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 600, color: color || "#000" }}>{value}</span>
    </div>
  );
}

function Ins({ icon, text, color = "#6e6e73" }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f7" }}>
      <span style={{ fontSize: 13, color, flexShrink: 0, width: 16, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 13, color: color !== "#6e6e73" ? "#000" : "#6e6e73", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

/* ── Tokens ── */
const lbl   = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#aeaeb2", textTransform: "uppercase" };
const h1    = { fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", color: "#000", marginTop: 8, lineHeight: 1.1 };
const cardS = { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 18,
                padding: "20px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,.04)" };
const sl    = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#aeaeb2",
                textTransform: "uppercase", marginBottom: 14 };
const tiS   = { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8,
                padding: "7px 12px", fontSize: 13, outline: "none", color: "#000",
                fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` };
