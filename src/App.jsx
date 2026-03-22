import { useState, useCallback } from "react";

const calcRSI = (prices, n = 14) => {
  const d = prices.slice(1).map((v, i) => v - prices[i]);
  let g = 0, l = 0;
  d.slice(0, n).forEach(c => c > 0 ? g += c : l -= c);
  let ag = g / n, al = l / n;
  d.slice(n).forEach(c => {
    ag = (ag * (n - 1) + Math.max(0, c)) / n;
    al = (al * (n - 1) + Math.max(0, -c)) / n;
  });
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
};

const calcEMA = (prices, n) => {
  const k = 2 / (n + 1);
  return prices.reduce((acc, v, i) => {
    acc.push(i === 0 ? v : v * k + acc[i - 1] * (1 - k));
    return acc;
  }, []);
};

const calcMACD = (prices) => {
  const e12 = calcEMA(prices, 12), e26 = calcEMA(prices, 26);
  const line = e12.map((v, i) => v - e26[i]);
  const sig = calcEMA(line.slice(26), 9);
  const last = line[line.length - 1], ls = sig[sig.length - 1];
  return { macd: last, signal: ls, hist: last - ls };
};

const calcBB = (prices, n = 20) => {
  const sl = prices.slice(-n);
  const avg = sl.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(sl.reduce((s, v) => s + (v - avg) ** 2, 0) / n);
  return { upper: avg + 2 * std, mid: avg, lower: avg - 2 * std };
};

const STOCKS = {
  "7203": { name: "トヨタ自動車", sector: "自動車", base: 3180 },
  "6758": { name: "ソニーグループ", sector: "電機", base: 12800 },
  "9984": { name: "ソフトバンクG", sector: "通信", base: 9200 },
  "8306": { name: "三菱UFJ", sector: "銀行", base: 1520 },
  "6861": { name: "キーエンス", sector: "精密機器", base: 67000 },
  "9432": { name: "NTT", sector: "通信", base: 158 },
};

const getMock = (code) => {
  const s = STOCKS[code] || { name: `銘柄${code}`, sector: "その他", base: 2000 };
  const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
  const closes = Array.from({ length: 60 }, (_, i) =>
    Math.round(s.base + Math.sin(i * 0.15 + seed) * s.base * 0.03 +
      Math.sin(i * 0.5 + seed * 2) * s.base * 0.02 +
      (Math.sin(i * 7.3 + seed * 5) * 0.5 + Math.sin(i * 3.1 + seed * 3) * 0.5) * s.base * 0.012)
  );
  const vols = closes.map((_, i) => Math.round(800000 + Math.sin(i * 0.7 + seed) * 400000 + Math.sin(i * 2.1) * 200000));
  return { code, ...s, closes, vols, current: closes[closes.length - 1] };
};

const demoAnalysis = (data, ind) => {
  const { rsi, macd, bb } = ind;
  const cur = data.current;
  const bbPos = (cur - bb.lower) / (bb.upper - bb.lower) * 100;
  let verdict, score, reason, point;
  if (rsi < 35 && macd.hist > 0) {
    verdict = "買い"; score = 78;
    reason = `RSI${rsi.toFixed(0)}と売られ過ぎ圏にあり、MACDが好転しています。反発局面に入った可能性が高く、押し目買いの好機と判断します。`;
    point = "RSI底打ち＋MACDクロスの複合シグナル";
  } else if (rsi > 68) {
    verdict = "売り"; score = 25;
    reason = `RSI${rsi.toFixed(0)}と買われ過ぎ圏に達しています。上値が重く、短期的な調整リスクが高まっています。`;
    point = "高RSI域での上値警戒、利確検討タイミング";
  } else if (rsi < 45 && bbPos < 30) {
    verdict = "買い"; score = 63;
    reason = `ボリンジャーバンド下限付近まで下落しており、平均回帰の観点から反発期待があります。過熱感は見られません。`;
    point = "BB下限タッチによる平均回帰シグナル";
  } else {
    verdict = "様子見"; score = 50;
    reason = `RSI${rsi.toFixed(0)}と中立圏で方向感に乏しい状況です。明確なシグナルが出ておらず、もう少し動向を確認してからエントリーを検討することをお勧めします。`;
    point = "明確なシグナル待ち、エントリーは急がず";
  }
  const up = verdict === "買い" ? 0.07 : 0.03;
  return {
    verdict, score, reason, point,
    target: Math.round(cur * (1 + up)),
    stop: Math.round(cur * 0.96),
    risk: rsi > 65 ? "高" : rsi < 35 ? "低" : "中",
    horizon: verdict === "買い" && rsi < 35 ? "短期（1〜5日）" : "中期（2〜4週間）",
    rr: (up / 0.04).toFixed(1),
  };
};

const claudeAnalysis = async (data, ind, apiKey) => {
  const { rsi, macd, bb, volRatio } = ind;
  const prompt = `あなたはプロの株式アナリストです。以下データを分析し、必ずJSONのみで回答してください。マークダウン不要。
銘柄: ${data.name}（${data.code}）/ ${data.sector}
現在値: ¥${data.current.toLocaleString()}
RSI(14): ${rsi.toFixed(1)}
MACD ヒスト: ${macd.hist.toFixed(1)}
BB上限:¥${bb.upper.toFixed(0)} 下限:¥${bb.lower.toFixed(0)}
出来高比: ${volRatio.toFixed(2)}倍
{"verdict":"買い or 様子見 or 売り","score":整数0-100,"reason":"根拠3文","target":利確価格整数,"stop":損切価格整数,"risk":"高 or 中 or 低","horizon":"保有期間","point":"最重要ポイント1文","rr":"リスクリワード比"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const text = json.content?.[0]?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
};

const MiniChart = ({ prices, color }) => {
  const mn = Math.min(...prices), mx = Math.max(...prices);
  const norm = prices.map(p => ((p - mn) / (mx - mn)) * 100);
  const pts = norm.map((v, i) => `${(i / (norm.length - 1)) * 300},${100 - v}`).join(" ");
  return (
    <svg viewBox="0 0 300 100" style={{ width: "100%", height: 55 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${pts} 300,100`} fill="url(#cg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx={300} cy={100 - norm[norm.length - 1]} r="5" fill={color}
        style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
    </svg>
  );
};

const Ring = ({ score, color }) => {
  const r = 30, c = 2 * Math.PI * r, d = (score / 100) * c;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#1a2840" strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${d} ${c}`} strokeLinecap="round" transform="rotate(-90 40 40)"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      <text x="40" y="38" textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="monospace">{score}</text>
      <text x="40" y="52" textAnchor="middle" fill="#3a5070" fontSize="9" fontFamily="monospace">SCORE</text>
    </svg>
  );
};

const vc = v => v === "買い" ? "#00ff88" : v === "売り" ? "#ff4466" : "#ffaa00";

export default function KabuAI() {
  const [ticker, setTicker] = useState("7203");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState(null);
  const [ind, setInd] = useState(null);
  const [res, setRes] = useState(null);
  const [isDemo, setIsDemo] = useState(true);
  const [err, setErr] = useState("");

  const run = useCallback(async () => {
    setLoading(true); setErr(""); setRes(null);
    try {
      const data = getMock(ticker); setStock(data);
      const rsi = calcRSI(data.closes);
      const macd = calcMACD(data.closes);
      const bb = calcBB(data.closes);
      const avgVol = data.vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const volRatio = data.vols[data.vols.length - 1] / avgVol;
      const indicators = { rsi, macd, bb, volRatio };
      setInd(indicators);
      if (apiKey) {
        const result = await claudeAnalysis(data, indicators, apiKey);
        setRes(result); setIsDemo(false);
      } else {
        await new Promise(r => setTimeout(r, 900));
        setRes(demoAnalysis(data, indicators)); setIsDemo(true);
      }
    } catch (e) {
      setErr("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker, apiKey]);

  return (
    <div style={{ background: "#060a10", minHeight: "100vh", color: "#b0c8e8", fontFamily: "'JetBrains Mono','Courier New',monospace", padding: 16, maxWidth: 500, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Barlow+Condensed:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .bl { animation: blink 2s infinite; }
        .fu { animation: fadeUp .4s ease forwards; }
        .sp { animation: spin .9s linear infinite; display:inline-block; width:14px; height:14px; border:2px solid #1e4030; border-top-color:#00ff88; border-radius:50%; vertical-align:middle; margin-right:8px; }
      `}</style>

      {/* ヘッダー */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <div className="bl" style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
          <span style={{ fontSize: 10, color: "#1a4030", letterSpacing: 3 }}>APIキー不要でデモ動作</span>
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: 2, color: "#fff", lineHeight: 1 }}>
          KABU<span style={{ color: "#00ff88", textShadow: "0 0 18px rgba(0,255,136,.4)" }}>AI</span>
        </h1>
        <p style={{ fontSize: 10, color: "#1e3850", marginTop: 3, letterSpacing: 1.5 }}>日本株 AI分析エンジン — J-QUANTS × CLAUDE</p>
      </div>

      {/* 銘柄選択 */}
      <div style={{ background: "#0c1420", border: "1px solid #162030", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#1e3050", letterSpacing: 2, marginBottom: 10 }}>▸ 銘柄を選ぶ</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(STOCKS).map(([code, s]) => (
            <button key={code} onClick={() => setTicker(code)} style={{
              padding: "7px 12px", borderRadius: 7,
              border: `1px solid ${ticker === code ? "#00ff88" : "#1a2840"}`,
              background: ticker === code ? "rgba(0,255,136,.1)" : "transparent",
              color: ticker === code ? "#00ff88" : "#3a5870",
              fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              transition: "all .15s"
            }}>
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* APIキー */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setShowKey(!showKey)} style={{
          width: "100%", padding: "9px 14px", border: "1px dashed #162030",
          background: "transparent", color: "#1e4050", fontSize: 11,
          fontFamily: "inherit", letterSpacing: 1, textAlign: "left",
          borderRadius: 8, cursor: "pointer"
        }}>
          {showKey ? "▾" : "▸"} Claude APIキーを設定（省略可・デモで動きます）
        </button>
        {showKey && (
          <div style={{ marginTop: 6 }}>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${apiKey ? "#00ff8866" : "#162030"}`,
                background: "#060a10", color: "#b0c8e8",
                fontSize: 12, fontFamily: "inherit", outline: "none", marginBottom: 4
              }} />
            <div style={{ fontSize: 10, color: apiKey ? "#00aa55" : "#1e4050" }}>
              {apiKey ? "✓ リアルClaude AI分析で動作します" : "未入力 → デモモードで動作します"}
            </div>
          </div>
        )}
      </div>

      {/* 実行ボタン */}
      <button onClick={run} disabled={loading} style={{
        width: "100%", padding: 15, borderRadius: 10,
        border: loading ? "1px solid #162030" : "none",
        background: loading ? "#0c1420" : "linear-gradient(135deg,#00dd70,#00ff88)",
        color: loading ? "#1e4030" : "#060a10",
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: 17, fontWeight: 800, letterSpacing: 3,
        cursor: loading ? "not-allowed" : "pointer", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {loading && <span className="sp" />}
        {loading ? "分析中..." : "▸ AI分析を実行"}
      </button>

      {err && (
        <div style={{ background: "rgba(255,68,102,.08)", border: "1px solid #ff446633", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 12, color: "#ff6680" }}>
          ⚠ {err}
        </div>
      )}

      {/* 結果 */}
      {stock && ind && res && (
        <div className="fu">
          {isDemo && (
            <div style={{ background: "rgba(255,170,0,.06)", border: "1px solid #ffaa0022", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: "#886600", display: "flex", gap: 6 }}>
              <span>⚡</span><span>デモ分析中。APIキーを入れるとリアルClaude AI分析になります。</span>
            </div>
          )}

          {/* 銘柄＋判定 */}
          <div style={{ background: vc(res.verdict) + "08", border: `1px solid ${vc(res.verdict)}22`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#3a5070", marginBottom: 2 }}>{stock.code} · {stock.sector}</div>
                <div style={{ fontSize: 20, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: "#fff", marginBottom: 4 }}>{stock.name}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: vc(res.verdict), fontFamily: "'Barlow Condensed',sans-serif" }}>¥{stock.current.toLocaleString()}</div>
                <MiniChart prices={stock.closes} color={vc(res.verdict)} />
              </div>
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <Ring score={res.score} color={vc(res.verdict)} />
                <div style={{ marginTop: 8, padding: "6px 14px", borderRadius: 8, background: vc(res.verdict) + "18", border: `1px solid ${vc(res.verdict)}44`, color: vc(res.verdict), fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>
                  {res.verdict}
                </div>
              </div>
            </div>
          </div>

          {/* テクニカル指標 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { label: "RSI (14)", val: ind.rsi.toFixed(1), note: ind.rsi < 30 ? "⚡売られ過ぎ" : ind.rsi > 70 ? "⚠買われ過ぎ" : "中立圏", col: ind.rsi < 40 ? "#00ff88" : ind.rsi > 65 ? "#ff4466" : "#4a6080", hot: ind.rsi < 30 || ind.rsi > 70 },
              { label: "MACD ヒスト", val: (ind.macd.hist > 0 ? "+" : "") + ind.macd.hist.toFixed(1), note: ind.macd.hist > 0 ? "上昇モメンタム" : "下降圧力", col: ind.macd.hist > 0 ? "#00ff88" : "#ff4466", hot: false },
              { label: "BB内位置", val: `${Math.round((stock.current - ind.bb.lower) / (ind.bb.upper - ind.bb.lower) * 100)}%`, note: stock.current < ind.bb.lower ? "下抜け！" : stock.current > ind.bb.upper ? "上抜け！" : "バンド内", col: "#8aa8c8", hot: stock.current < ind.bb.lower || stock.current > ind.bb.upper },
              { label: "出来高比", val: `${ind.volRatio.toFixed(2)}x`, note: ind.volRatio > 1.5 ? "⚡急増！" : "通常範囲", col: ind.volRatio > 1.5 ? "#00ff88" : "#4a6080", hot: ind.volRatio > 1.5 },
            ].map(t => (
              <div key={t.label} style={{ background: "#0c1420", border: `1px solid ${t.hot ? t.col + "44" : "#162030"}`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 9, color: "#1e3050", letterSpacing: 1, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: t.col, fontFamily: "'Barlow Condensed',sans-serif" }}>{t.val}</div>
                <div style={{ fontSize: 10, color: t.hot ? t.col : "#1e3050", marginTop: 2 }}>{t.note}</div>
              </div>
            ))}
          </div>

          {/* 売買ポイント */}
          <div style={{ background: "#0c1420", border: "1px solid #162030", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#1e3050", letterSpacing: 2, marginBottom: 12 }}>▸ 売買ポイント</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ textAlign: "center", padding: "12px 6px", borderRadius: 10, background: "rgba(0,255,136,.05)", border: "1px solid rgba(0,255,136,.2)" }}>
                <div style={{ fontSize: 10, color: "#1e5030", marginBottom: 4 }}>利確目標</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#00ff88" }}>¥{res.target?.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#00aa55", marginTop: 2 }}>+{(((res.target - stock.current) / stock.current) * 100).toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#1e3050", marginBottom: 2 }}>現在値</div>
                <div style={{ fontSize: 13, color: "#8aa8c8", fontWeight: 700 }}>¥{stock.current.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: "#1e3050", marginTop: 6 }}>R/R比</div>
                <div style={{ fontSize: 14, color: "#ffaa00", fontWeight: 700 }}>{res.rr}</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 6px", borderRadius: 10, background: "rgba(255,68,102,.05)", border: "1px solid rgba(255,68,102,.2)" }}>
                <div style={{ fontSize: 10, color: "#501e2a", marginBottom: 4 }}>損切ライン</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ff4466" }}>¥{res.stop?.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#aa2244", marginTop: 2 }}>-{(((stock.current - res.stop) / stock.current) * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#3a5070" }}>
              <span>リスク: <span style={{ color: res.risk === "高" ? "#ff4466" : res.risk === "低" ? "#00ff88" : "#ffaa00", fontWeight: 700 }}>{res.risk}</span></span>
              <span>{res.horizon}</span>
            </div>
          </div>

          {/* AIコメント */}
          <div style={{ background: "#0c1420", border: "1px solid #162030", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#1e3050", letterSpacing: 2, marginBottom: 10 }}>▸ AI分析レポート</div>
            <p style={{ fontSize: 13, lineHeight: 1.85, color: "#607090", marginBottom: 12 }}>{res.reason}</p>
            <div style={{ background: vc(res.verdict) + "07", border: `1px solid ${vc(res.verdict)}22`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: vc(res.verdict), lineHeight: 1.6 }}>
              💡 {res.point}
            </div>
          </div>

          <div style={{ fontSize: 10, color: "#0e1e2e", textAlign: "center", lineHeight: 1.7 }}>
            ※ 投資判断の補助目的のみ。最終判断はご自身の責任で行ってください。
          </div>
        </div>
      )}
    </div>
  );
}
