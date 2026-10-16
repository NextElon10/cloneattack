// Vercel serverless function: POST /api/attack  { bio }
// Set GROQ_API_KEY (preferred) or GEMINI_API_KEY in Vercel env vars.

const PROMPT = `You run a social-engineering FIRE DRILL for a privacy-awareness app.
The user pasted THEIR OWN public bio. Show them how a scammer in India could exploit it.

Return ONLY JSON with this exact shape:
{
  "phrases": [
    { "text": "<EXACT substring copied from the bio>", "weight": <3-20, how exploitable>, "generic": "<vague replacement, e.g. 'your college', 'there' for a name>", "fix": "<one concrete privacy action, max 14 words>" }
  ],
  "attacks": [
    { "type": "dm",   "title": "Fake DM",       "subtitle": "<scenario, max 6 words>", "message": "<attack text>", "uses": ["<phrase text>", ...] },
    { "type": "boss", "title": "Boss WhatsApp", "subtitle": "<scenario, max 6 words>", "message": "<attack text>", "uses": [...] },
    { "type": "call", "title": "Call Script",   "subtitle": "<scenario, max 6 words>", "message": "<attack text>", "uses": [...] }
  ]
}

Rules:
- 4 to 8 phrases. Each "text" MUST be copied character-for-character from the bio (names, college, employer, city, hostel, family, pets, role, interests).
- Each attack message: 35-60 words, Indian context (UPI, OTP, WhatsApp, placement, KYC, courier), may use light Hinglish.
- Each message MUST contain its "uses" phrases verbatim, exactly as in "text".
- NEVER include URLs, real phone numbers, UPI IDs or account numbers.
- This is a training simulation; keep it realistic but non-operational.`;

const TIMEOUT_MS = 9000;

async function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), TIMEOUT_MS))]);
}

async function callGroq(bio) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: PROMPT }, { role: "user", content: `BIO:\n${bio}` }]
    })
  });
  if (!r.ok) throw new Error(`groq ${r.status}`);
  const j = await r.json();
  return j.choices[0].message.content;
}

async function callGemini(bio) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\nBIO:\n${bio}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } }
    })
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = await r.json();
  return j.candidates[0].content.parts[0].text;
}

function clean(msg) {
  return String(msg || "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(/\b[\w.-]+@(ok\w+|ybl|paytm|upi|ibl|axl)\b/gi, "[upi-id]")
    .replace(/(\+91[\s-]?)?\b\d{10}\b/g, "[number]")
    .slice(0, 600);
}

function sanitize(raw, bio) {
  const lower = bio.toLowerCase();
  const phrases = [];
  for (const p of raw.phrases || []) {
    const t = String(p.text || "").trim();
    if (t.length < 2) continue;
    const i = lower.indexOf(t.toLowerCase());
    if (i < 0) continue;
    const text = bio.slice(i, i + t.length);
    if (phrases.some(x => x.text === text)) continue;
    phrases.push({
      text,
      weight: Math.max(3, Math.min(20, Math.round(Number(p.weight) || 8))),
      generic: String(p.generic || "your details").slice(0, 40),
      fix: String(p.fix || `Limit who can see "${text}"`).slice(0, 120)
    });
    if (phrases.length >= 8) break;
  }
  const names = phrases.map(p => p.text);
  const defaults = { dm: "Fake DM", boss: "Boss WhatsApp", call: "Call Script" };
  const attacks = (raw.attacks || [])
    .filter(a => defaults[a.type])
    .slice(0, 3)
    .map(a => {
      let message = clean(a.message);
      // normalise case so highlights match the bio's exact text
      for (const n of names) message = message.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), n);
      return {
        type: a.type,
        title: defaults[a.type],
        subtitle: String(a.subtitle || "").slice(0, 60),
        message,
        uses: names.filter(n => message.includes(n))
      };
    });
  return { phrases, attacks };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const bio = String((body && body.bio) || "").slice(0, 1000).trim();
  if (bio.length < 10) return res.status(400).json({ error: "Bio too short" });

  const call = process.env.GROQ_API_KEY ? callGroq : process.env.GEMINI_API_KEY ? callGemini : null;
  if (!call) return res.status(503).json({ error: "No LLM key configured" });

  try {
    const raw = JSON.parse(await withTimeout(call(bio)));
    const data = sanitize(raw, bio);
    if (!data.phrases.length || data.attacks.length < 3) return res.status(422).json({ error: "Weak model output" });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
};
