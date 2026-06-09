import { useState, useEffect, useCallback } from "react";

// ─── Brapi: somente PETR4 ────────────────────────────────────────────────────
const BRAPI_KEY = import.meta.env.VITE_BRAPI_KEY;

async function fetchBrapi() {
  if (!BRAPI_KEY) return {};
  const res = await fetch(`https://brapi.dev/api/quote/PETR4?token=${BRAPI_KEY}`);
  const data = await res.json();
  const q = data.results?.[0];
  if (!q) return {};
  return {
    petr4: {
      price:  q.regularMarketPrice,
      change: q.regularMarketChange,
      pct:    q.regularMarketChangePercent,
    },
  };
}

// ─── Twelve Data: Brent, WTI, DXY, XLE, S&P500 ───────────────────────────────
const TWELVE_KEY = import.meta.env.VITE_TWELVE_KEY;

// symbol map: internal key → Twelve Data symbol
const TWELVE_SYMBOLS = {
  brent:  "UKOIL",
  wti:    "USOIL",
  dxy:    "DXY",
  xle:    "XLE",
  sp500:  "SPX",
  usdbrl: "USD/BRL",
  ibov:   "IBOV",
};

async function fetchTwelveData() {
  if (!TWELVE_KEY) return null;

  const symbols = Object.values(TWELVE_SYMBOLS).join(",");
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${TWELVE_KEY}`
  );
  const data = await res.json();

  const parse = (sym) => {
    const q = data[sym];
    if (!q || q.status === "error") return null;
    const price  = parseFloat(q.close);
    const change = parseFloat(q.change);
    const pct    = parseFloat(q.percent_change);
    if (isNaN(price)) return null;
    return { price, change, pct };
  };

  return {
    brent:  parse("UKOIL"),
    wti:    parse("USOIL"),
    dxy:    parse("DXY"),
    xle:    parse("XLE"),
    sp500:  parse("SPX"),
    usdbrl: parse("USD/BRL"),
    ibov:   parse("IBOV"),
  };
}

// ─── Ticker config ────────────────────────────────────────────────────────────
const TICKERS = {
  brent:  { label: "Brent Crude",    symbol: "BZ=F",     unit: "USD/bbl", color: "#f59e0b" },
  wti:    { label: "WTI Crude",      symbol: "CL=F",     unit: "USD/bbl", color: "#f97316" },
  dxy:    { label: "DXY (US Dollar)", symbol: "DX-Y.NYB", unit: "pts",     color: "#60a5fa" },
  usdbrl: { label: "USD/BRL",        symbol: "BRL=X",    unit: "R$",      color: "#34d399" },
  petr4:  { label: "PETR4",          symbol: "PETR4.SA", unit: "R$",      color: "#a78bfa" },
  ibov:   { label: "IBOVESPA",       symbol: "^BVSP",    unit: "pts",     color: "#fb7185" },
  xle:    { label: "XLE ETF",        symbol: "XLE",      unit: "USD",     color: "#fbbf24" },
  sp500:  { label: "S&P 500",        symbol: "^GSPC",    unit: "pts",     color: "#38bdf8" },
};

// ─── Mock market data ─────────────────────────────────────────────────────────
function getMockData() {
  const base = {
    brent:  { price: 78.42,   change: -0.83, pct: -1.05 },
    wti:    { price: 74.18,   change: -0.71, pct: -0.95 },
    dxy:    { price: 104.32,  change:  0.28, pct:  0.27 },
    usdbrl: { price: 5.14,    change:  0.03, pct:  0.58 },
    petr4:  { price: 38.76,   change: -0.44, pct: -1.12 },
    ibov:   { price: 132480,  change: -620,  pct: -0.47 },
    xle:    { price: 89.14,   change: -0.92, pct: -1.02 },
    sp500:  { price: 5412,    change:  18.3, pct:  0.34 },
  };
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => {
      const drift = (Math.random() - 0.5) * 0.002;
      return [k, { ...v, price: +(v.price * (1 + drift)).toFixed(2) }];
    })
  );
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ positive }) {
  const pts = Array.from({ length: 20 }, (_, i) => {
    const base = 30 + Math.random() * 20;
    const trend = positive ? i * 0.8 : -i * 0.8;
    return base + trend + (Math.random() - 0.5) * 8;
  });
  const min = Math.min(...pts), max = Math.max(...pts);
  const norm = pts.map(p => ((p - min) / (max - min)) * 38 + 1);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"}${(i / 19) * 120},${40 - y}`).join(" ");
  return (
    <svg width="120" height="40" viewBox="0 0 120 40">
      <path d={path} fill="none" stroke={positive ? "#34d399" : "#f87171"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Ticker Card ──────────────────────────────────────────────────────────────
function TickerCard({ id, data }) {
  const cfg = TICKERS[id];
  if (!data) return (
    <div style={{
      background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column",
      gap: 6, minWidth: 0, opacity: 0.4,
    }}>
      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>{cfg.symbol}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{cfg.label}</div>
      <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>— sem dados —</div>
    </div>
  );
  const up = data.pct >= 0;
  return (
    <div style={{
      background: "rgba(15,20,35,0.85)",
      border: `1px solid ${up ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
      borderRadius: 12, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 6,
      backdropFilter: "blur(8px)", transition: "border-color 0.3s", minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>{cfg.symbol}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{cfg.label}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: up ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
          color: up ? "#34d399" : "#f87171", fontFamily: "monospace",
        }}>
          {up ? "▲" : "▼"} {Math.abs(data.pct).toFixed(2)}%
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {id === "ibov" ? data.price.toLocaleString("pt-BR") : data.price.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: up ? "#34d399" : "#f87171", marginTop: 3, fontFamily: "monospace" }}>
            {up ? "+" : ""}{data.change.toFixed(2)} {cfg.unit}
          </div>
        </div>
        <Sparkline positive={up} />
      </div>
    </div>
  );
}

// ─── Signal Gauge ─────────────────────────────────────────────────────────────
function SignalGauge({ score }) {
  const label = score >= 60 ? "COMPRA FORTE" : score >= 20 ? "COMPRA" : score >= -20 ? "NEUTRO" : score >= -60 ? "VENDA" : "VENDA FORTE";
  const color = score >= 60 ? "#34d399" : score >= 20 ? "#86efac" : score >= -20 ? "#fbbf24" : score >= -60 ? "#f87171" : "#ef4444";
  const cx = 100, cy = 80, r = 60;
  const toRad = d => (d - 90) * Math.PI / 180;
  const arcPath = (startDeg, endDeg, radius) => {
    const s = toRad(startDeg + 90), e = toRad(endDeg + 90);
    return `M${cx + radius * Math.cos(s)},${cy + radius * Math.sin(s)} A${radius},${radius},0,${endDeg - startDeg > 180 ? 1 : 0},1,${cx + radius * Math.cos(e)},${cy + radius * Math.sin(e)}`;
  };
  const needleAngle = (score / 100) * 90;
  const nRad = toRad(needleAngle + 90);
  const nx = cx + 55 * Math.cos(nRad), ny = cy + 55 * Math.sin(nRad);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="200" height="105" viewBox="0 0 200 105">
        <path d={arcPath(-90, 90, 60)} fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
        <path d={arcPath(-90, needleAngle, 60)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" opacity="0.8" />
        {[[-80, "VENDA"], [0, "NEUTRO"], [80, "COMPRA"]].map(([a, t]) => {
          const rad = toRad(a + 90);
          return <text key={t} x={cx + 78 * Math.cos(rad)} y={cy + 78 * Math.sin(rad)} fill="#475569" fontSize="7" textAnchor="middle" fontFamily="monospace">{t}</text>;
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        <circle cx={cx} cy={cy} r="3" fill="#0f1421" />
      </svg>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "'JetBrains Mono', monospace", marginTop: -8 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Score: {score > 0 ? "+" : ""}{score}/100</div>
    </div>
  );
}

// ─── Prediction Badge ─────────────────────────────────────────────────────────
function PredictionBadge({ direction, confidence }) {
  const up = direction === "UP";
  return (
    <div style={{
      background: up ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
      border: `1px solid ${up ? "#34d399" : "#f87171"}`,
      borderRadius: 16, padding: "20px 28px", textAlign: "center",
    }}>
      <div style={{ fontSize: 48 }}>{up ? "📈" : "📉"}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: up ? "#34d399" : "#f87171", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
        PETR4 AMANHÃ: {up ? "ALTA" : "BAIXA"}
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Confiança:</span>
        <div style={{ background: "#1e293b", borderRadius: 20, height: 8, width: 120, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${confidence}%`, background: up ? "#34d399" : "#f87171", borderRadius: 20, transition: "width 1s ease" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: up ? "#34d399" : "#f87171", fontFamily: "monospace" }}>{confidence}%</span>
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>
        *Baseado em análise de correlações. Não é recomendação financeira.
      </div>
    </div>
  );
}

// ─── API Key Modal ────────────────────────────────────────────────────────────
function ApiKeyModal({ onSave }) {
  const [val, setVal] = useState("");
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#0f1421", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16,
        padding: 32, width: "min(420px, 90vw)",
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🔑</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>Chave de API Anthropic</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
          Para usar a análise IA, informe sua chave da API Anthropic. Ela fica salva apenas no seu navegador (localStorage) e nunca é enviada a outros servidores.
        </div>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && val.startsWith("sk-") && onSave(val)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "#1e293b", color: "#f1f5f9", fontSize: 14, fontFamily: "monospace",
            outline: "none", boxSizing: "border-box", marginBottom: 12,
          }}
        />
        <button
          onClick={() => val.startsWith("sk-") && onSave(val)}
          disabled={!val.startsWith("sk-")}
          style={{
            width: "100%", padding: 12, borderRadius: 8, border: "none", cursor: val.startsWith("sk-") ? "pointer" : "not-allowed",
            background: val.startsWith("sk-") ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "#1e293b",
            color: "#fff", fontSize: 14, fontWeight: 700, transition: "all 0.2s",
          }}
        >
          Salvar e continuar
        </button>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 12, textAlign: "center" }}>
          Obtenha sua chave em console.anthropic.com
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PetroWatch() {
  const [market, setMarket] = useState(getMockData());
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [tab, setTab] = useState("dashboard");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("pw_api_key") || "");
  const [showKeyModal, setShowKeyModal] = useState(false);

  const refreshMarket = useCallback(async () => {
    const base = getMockData();
    try {
      const [brapi, twelve] = await Promise.allSettled([fetchBrapi(), fetchTwelveData()]);
      const b = brapi.status === "fulfilled" ? brapi.value : {};
      const t = twelve.status === "fulfilled" ? twelve.value : null;
      setMarket({
        ...base,
        petr4:  b.petr4       ?? null,
        ibov:   t?.ibov       ?? null,
        usdbrl: t?.usdbrl     ?? null,
        brent:  t?.brent      ?? null,
        wti:    t?.wti        ?? null,
        dxy:    t?.dxy        ?? null,
        xle:    t?.xle        ?? null,
        sp500:  t?.sp500      ?? null,
      });
    } catch {
      setMarket(base);
    }
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    refreshMarket();
    const id = setInterval(refreshMarket, 5 * 60 * 1000); // 5 min
    return () => clearInterval(id);
  }, [refreshMarket]);

  const saveKey = (key) => {
    localStorage.setItem("pw_api_key", key);
    setApiKey(key);
    setShowKeyModal(false);
  };

  const runAnalysis = useCallback(async () => {
    if (!apiKey) { setShowKeyModal(true); return; }
    setLoading(true);
    setTab("analysis");
    const d = market;
    const prompt = `Você é um analista especializado em Petrobras (PETR4) e mercados de commodities.

Com base nos dados de mercado abaixo (horário antes da abertura da Bovespa), faça uma análise completa:

DADOS DE MERCADO ATUAIS:
- Brent Crude: $${d.brent.price} (${d.brent.pct > 0 ? "+" : ""}${d.brent.pct}%)
- WTI Crude: $${d.wti.price} (${d.wti.pct > 0 ? "+" : ""}${d.wti.pct}%)
- DXY (Dólar Index): ${d.dxy.price} pts (${d.dxy.pct > 0 ? "+" : ""}${d.dxy.pct}%)
- USD/BRL: R$${d.usdbrl.price} (${d.usdbrl.pct > 0 ? "+" : ""}${d.usdbrl.pct}%)
- PETR4: R$${d.petr4.price} (${d.petr4.pct > 0 ? "+" : ""}${d.petr4.pct}%)
- IBOVESPA: ${d.ibov.price.toLocaleString("pt-BR")} pts (${d.ibov.pct > 0 ? "+" : ""}${d.ibov.pct}%)
- XLE ETF (energia global): $${d.xle.price} (${d.xle.pct > 0 ? "+" : ""}${d.xle.pct}%)
- S&P 500: ${d.sp500.price} pts (${d.sp500.pct > 0 ? "+" : ""}${d.sp500.pct}%)

Responda SOMENTE em JSON válido, sem markdown, sem texto fora do JSON, com esta estrutura exata:
{
  "score": <número de -100 a 100>,
  "direction": "<UP ou DOWN>",
  "confidence": <0 a 95>,
  "recommendation": "<COMPRA FORTE | COMPRA | NEUTRO | VENDA | VENDA FORTE>",
  "summary": "<resumo executivo em 2 frases>",
  "positives": ["<fator 1>", "<fator 2>", "<fator 3>"],
  "negatives": ["<fator 1>", "<fator 2>", "<fator 3>"],
  "risks": ["<risco 1>", "<risco 2>"],
  "targets": { "support": <R$>, "resistance": <R$>, "target_bull": <R$>, "target_bear": <R$> },
  "context": "<análise detalhada em 2 parágrafos curtos>"
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.status === 401) {
        localStorage.removeItem("pw_api_key");
        setApiKey("");
        setShowKeyModal(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "{}";
      let clean = text.replace(/```json|```/g, "").trim();
      // fix truncated JSON: close open string then object
      if (data.stop_reason === "max_tokens") {
        clean = clean.replace(/,?\s*"context"\s*:\s*"[^"]*$/, '') + '}';
      }
      setAnalysis(JSON.parse(clean));
    } catch {
      setAnalysis({ error: true, summary: "Erro ao carregar análise. Verifique sua chave de API e tente novamente." });
    }
    setLoading(false);
  }, [market, apiKey]);

  return (
    <div style={{
      minHeight: "100vh", background: "#070c18", color: "#f1f5f9",
      fontFamily: "'Inter', sans-serif",
      backgroundImage: "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(245,158,11,0.06) 0%, transparent 60%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {showKeyModal && <ApiKeyModal onSave={saveKey} />}

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #f59e0b, #ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛢</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>PetroWatch <span style={{ color: "#f59e0b" }}>AI</span></div>
            <div style={{ fontSize: 11, color: "#475569" }}>Monitor inteligente · PETR4</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {apiKey && (
            <button onClick={() => setShowKeyModal(true)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px", color: "#64748b", fontSize: 11, cursor: "pointer" }}>
              🔑 API
            </button>
          )}
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>⟳ {lastUpdate.toLocaleTimeString("pt-BR")}</div>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 4 }}>
        {[["dashboard", "📊 Dashboard"], ["analysis", "🤖 Análise IA"]].map(([t, l]) => (
          <button key={t} onClick={() => t === "analysis" && !analysis ? runAnalysis() : setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "14px 16px",
            fontSize: 13, fontWeight: 600, color: tab === t ? "#f59e0b" : "#64748b",
            borderBottom: tab === t ? "2px solid #f59e0b" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
              {Object.keys(TICKERS).map(id => <TickerCard key={id} id={id} data={market[id]} />)}
            </div>

            <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 16, letterSpacing: "0.05em", textTransform: "uppercase" }}>Correlações-Chave para PETR4</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {[
                  { label: "Brent vs PETR4",   value: "0.72",  desc: "Alta correlação positiva",      color: "#34d399" },
                  { label: "DXY vs Brent",      value: "-0.58", desc: "Dólar forte = petróleo menor",  color: "#f87171" },
                  { label: "USD/BRL vs PETR4",  value: "0.41",  desc: "Dólar alto beneficia receita", color: "#fbbf24" },
                  { label: "S&P500 vs IBOV",    value: "0.65",  desc: "Risco global impacta Bovespa", color: "#60a5fa" },
                ].map(c => (
                  <div key={c.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.color, fontFamily: "monospace", margin: "4px 0" }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={runAnalysis} style={{
              width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff",
              fontSize: 15, fontWeight: 800, letterSpacing: "0.02em",
              boxShadow: "0 4px 24px rgba(245,158,11,0.3)",
            }}>
              🤖 Gerar Análise IA + Previsão para Amanhã
            </button>
          </>
        )}

        {/* ANALYSIS TAB */}
        {tab === "analysis" && (
          <>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
                <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: 8 }}>Analisando dados de mercado...</div>
                <div style={{ fontSize: 13, color: "#475569" }}>Cruzando Brent, câmbio, bolsas internacionais e indicadores técnicos</div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:.2}50%{opacity:1} }`}</style>
              </div>
            )}

            {!loading && analysis && !analysis.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Recomendação Atual</div>
                    <SignalGauge score={analysis.score} />
                  </div>
                  <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Previsão Próximo Pregão</div>
                    <PredictionBadge direction={analysis.direction} confidence={analysis.confidence} />
                  </div>
                </div>

                <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Resumo Executivo</div>
                  <div style={{ fontSize: 15, color: "#cbd5e1", lineHeight: 1.7 }}>{analysis.summary}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: 12, color: "#34d399", marginBottom: 12, fontWeight: 700, letterSpacing: "0.05em" }}>✅ FATORES POSITIVOS</div>
                    {analysis.positives?.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                        <span style={{ color: "#34d399", flexShrink: 0 }}>▸</span>{p}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12, fontWeight: 700, letterSpacing: "0.05em" }}>⚠️ FATORES NEGATIVOS</div>
                    {analysis.negatives?.map((n, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                        <span style={{ color: "#f87171", flexShrink: 0 }}>▸</span>{n}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Níveis de Preço PETR4</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {[
                      { label: "Suporte",     key: "support",     color: "#60a5fa" },
                      { label: "Alvo Bear",   key: "target_bear", color: "#f87171" },
                      { label: "Alvo Bull",   key: "target_bull", color: "#34d399" },
                      { label: "Resistência", key: "resistance",  color: "#fbbf24" },
                    ].map(t => (
                      <div key={t.key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{t.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: t.color, fontFamily: "monospace" }}>
                          R${analysis.targets?.[t.key]?.toFixed(2) ?? "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#fbbf24", marginBottom: 12, fontWeight: 700, letterSpacing: "0.05em" }}>🔔 RISCOS A MONITORAR</div>
                  {analysis.risks?.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                      <span style={{ color: "#fbbf24", flexShrink: 0 }}>▸</span>{r}
                    </div>
                  ))}
                </div>

                <div style={{ background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Análise Detalhada</div>
                  <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, whiteSpace: "pre-line" }}>{analysis.context}</div>
                </div>

                <button onClick={runAnalysis} style={{
                  padding: "12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer",
                  background: "transparent", color: "#f59e0b", fontSize: 13, fontWeight: 600,
                }}>
                  🔄 Atualizar Análise com Dados Mais Recentes
                </button>
              </div>
            )}

            {!loading && analysis?.error && (
              <div style={{ textAlign: "center", padding: 40, color: "#f87171" }}>
                {analysis.summary}<br />
                <button onClick={runAnalysis} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 8, border: "1px solid #f87171", background: "none", color: "#f87171", cursor: "pointer" }}>Tentar novamente</button>
              </div>
            )}

            {!loading && !analysis && (
              <div style={{ textAlign: "center", padding: 60 }}>
                <button onClick={runAnalysis} style={{
                  padding: "16px 32px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff", fontSize: 15, fontWeight: 800,
                }}>🤖 Gerar Análise IA</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
