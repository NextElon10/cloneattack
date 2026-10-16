(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const state = { data: null, hidden: new Set(), base: 0, persona: "student", source: "", view: 0, bio: "", animated: new Set() };
  const bioEl = $("#bio");

  // ---------- categories & tactics ----------
  const CATS = {
    Identity: { c: "#7C6CF6", i: "👤" },
    Location: { c: "#E11D48", i: "📍" },
    Network: { c: "#0891B2", i: "🏫" },
    Family: { c: "#D97706", i: "👪" },
    Lifestyle: { c: "#059669", i: "🎯" }
  };
  function catOf(p) {
    if (p.cat && CATS[p.cat]) return p.cat;
    const g = (p.generic || "").toLowerCase();
    if (g === "there" || /name/.test(g)) return "Identity";
    if (/her school|child|daughter|son|family|kid/.test(g)) return "Family";
    if (/city|area|hostel|address|home/.test(g)) return "Location";
    if (/college|company|branch|role|bank|hr|hiring|school|team|job|employer/.test(g)) return "Network";
    return "Lifestyle";
  }

  const TACTICS = [
    { k: "Personalised hook", i: "🎯", test: (a) => a.uses.filter((u) => !state.hidden.has(u)).length >= 1, why: (a) => `Uses ${a.uses.filter((u) => !state.hidden.has(u)).length} of your real details so it feels legit.` },
    { k: "False familiarity", i: "🤝", re: /\b(senior|alum|fellow|friend|from your|it's [A-Z]|papa|mumma)\b/i, why: () => "Pretends to be someone from your circle." },
    { k: "Authority", i: "🏛️", re: /\b(placement|office|leadership|police|bank|HR|regional|courier|audit|KYC|daycare|vet|hospital)\b/i, why: () => "Borrows the voice of someone you're expected to trust or obey." },
    { k: "Urgency", i: "⏰", re: /\b(today|now|rn|urgent|hurry|right now|before \d|asap|immediately)\b/i, why: () => "Rushes you so you don't stop to verify." },
    { k: "Emotional pressure", i: "💔", re: /\b(accident|injured|fall|fell|hospital|stuck|emergency|okay but|safe but)\b/i, why: () => "Panic or sympathy shuts down careful thinking." },
    { k: "Secrecy", i: "🤫", re: /(don't tell|confidential|keep it quiet|keep this)/i, why: () => "Isolates you from people who'd spot the scam." },
    { k: "Money ask", i: "💸", re: /(₹|\bUPI\b|\bpay\b|deposit|\bsend\b|advance|\bfee\b)/i, why: () => "Ends in a payment: the scammer's real goal." },
    { k: "Credential grab", i: "🔑", re: /\b(OTP|Aadhaar|employee ID|password|resume|open it)\b/i, why: () => "Asks for data or a click that unlocks your accounts." }
  ];
  const VERIFY = {
    dm: "Call the person on the number <b>you already have saved</b>. Real friends don't mind waiting 2 minutes.",
    boss: "Confirm through an <b>official channel</b>: the college or company website, office landline, or your manager in person.",
    call: "<b>Hang up.</b> Call the official number yourself. No real bank, courier or hospital asks for an OTP or an upfront UPI payment."
  };
  const PHONES = {
    dm: { cls: "ig", app: "Instagram", who: "campus.connect_22", sub: "Not following you", av: "#C13584" },
    boss: { cls: "wa", app: "WhatsApp", who: "+91 9•••• ••471", sub: "Not in your contacts", av: "#25D366" },
    call: { cls: "call", app: "Phone", who: "Unknown caller", sub: "+91 8•••• ••902 · India", av: "#3F3A7A" }
  };

  // ---------- toast ----------
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3000); }

  // ---------- input ----------
  function setPersona(key) {
    state.persona = key;
    $$(".persona").forEach((b) => b.classList.toggle("on", b.dataset.p === key));
    bioEl.value = window.SAMPLES[key].bio; updateCount();
  }
  function updateCount() { $("#count").textContent = bioEl.value.length; }
  $$(".persona").forEach((b) => b.addEventListener("click", () => setPersona(b.dataset.p)));
  bioEl.addEventListener("input", updateCount);
  $("#clearBtn").addEventListener("click", () => { bioEl.value = ""; updateCount(); bioEl.focus(); });
  $$(".seg button").forEach((t) => t.addEventListener("click", () => {
    $$(".seg button").forEach((x) => x.classList.toggle("on", x === t));
    const own = t.dataset.mode === "own";
    $("#personaWrap").classList.toggle("hidden", own);
    if (own) { bioEl.value = ""; updateCount(); bioEl.focus(); } else setPersona(state.persona);
  }));

  // ---------- offline analyzer ----------
  const CITIES = ["New Delhi","Delhi","Mumbai","Bangalore","Bengaluru","Pune","Hyderabad","Chennai","Kolkata","Ahmedabad","Jaipur","Indore","Bhopal","Lucknow","Noida","Gurgaon","Gurugram","Chandigarh","Nagpur","Surat","Kochi","Goa","Nashik","Jalgaon","Thane","Vadodara","Mysore","Mysuru","Coimbatore","Patna","Ranchi","Dehradun","Bhubaneswar","Visakhapatnam","Kanpur","Agra","Varanasi","Amritsar","Ludhiana","Guwahati","Koramangala","Indiranagar","Whitefield","Andheri","Bandra","Powai","Dwarka","Saket","Kothrud","Hinjewadi","Vellore","Manipal"];

  function offlineAnalyze(bio) {
    const found = [];
    const add = (text, weight, generic, fix, cat) => {
      text = (text || "").trim().replace(/[|,.;:]+$/, "").trim();
      if (text.length < 2 || !bio.includes(text)) return null;
      if (found.some((f) => f.text.includes(text) || text.includes(f.text))) return null;
      const p = { text, weight, generic, fix, cat }; found.push(p); return p;
    };
    const m = (re) => { const r = bio.match(re); return r ? (r[1] || r[0]) : null; };

    const first = bio.split(/[|\n•·]/)[0].trim();
    const nm = first.match(/^([A-Z][a-z]{2,})(?:\s[A-Z][a-z]+)?$/);
    const name = nm ? add(nm[1], 10, "there", "Use a nickname or initial instead of your real first name", "Identity") : null;
    const hostel = add(m(/\b(?:Hostel|Block|Hall|Wing)[\s-]?[A-Z0-9][\w-]*/i), 18, "your hostel", "Remove your hostel or block: it pinpoints where you live", "Location");
    add(m(/\bRoom\s?\d+\b/i), 10, "your room", "Never post your room or flat number", "Location");
    const child = add(m(/(?<!(?:cat|dog|pet|fur)\s)\b(?:dad|mom|mum|mother|father|papa|mama)\s+(?:of|to)\s+([A-Z][a-z]+)/i), 18, "your child", "Never name your child publicly: it powers fake-emergency scams", "Family");
    const college = add(m(/\b(?:IIT|NIT|IIIT|BITS|VIT|SRM|DTU|NSUT|IIM|MIT|KIIT|LPU|Amity|Manipal)(?:\s[A-Z][a-z]+)?\b/) ||
      m(/\b(?:[A-Z][\w.&]*\s){1,4}(?:University|College|Institute(?:\sof\sTechnology)?)\b/), 16, "your college", "Hide your college or limit it to friends-only", "Network");
    const branch = add(m(/\b(?:CSE|ECE|EEE|IT|AIML|AIDS|Mech(?:anical)?|Civil|B\.?\s?Tech|BBA|BCA|MBA|MCA|B\.?Sc|M\.?Tech|B\.?Com)\b(?:[\s-]*(?:\d(?:st|nd|rd|th)\s?(?:year|yr|sem)|'?\d{2,4}))?/) ||
      m(/\b\d(?:st|nd|rd|th)\s?(?:year|yr)\b/i), 14, "your branch", "Drop your branch and year: it lets scammers pose as 'seniors'", "Network");
    const employer = add(m(/(?:\bat\b|@)\s*([A-Z][\w&.]*(?:\s[A-Z][\w&.]*){0,3})/), 16, "your company", "Hide your employer: it makes fake 'boss' messages believable", "Network");
    const role = add(m(/\b(?:(?:Senior|Junior|Lead|Branch|HR|Software|Product|Marketing|Sales|Finance|Bank|Placement)\s)?(?:Manager|Engineer|Developer|Founder|Co-founder|Analyst|Designer|Intern|Consultant|Recruiter|Teacher|Doctor|Coordinator)\b/), 10, "your role", "Your title tells attackers what you can approve: limit who sees it", "Network");
    let city = null;
    for (const c of CITIES) if (new RegExp(`\\b${reEsc(c)}\\b`).test(bio)) { city = add(c, 10, "your city", "Remove your city or neighbourhood", "Location"); if (city) break; }
    const pet = add(m(/\b(?:dog|cat|retriever|labrador|beagle|pug|indie)\s+(?:named\s+|mom to\s+|parent to\s+)?([A-Z][a-z]+)/i) || m(/\b(?:dog|cat|puppy|pet)\s(?:lover|mom|dad|parent)\b/i), 8, "your pet", "Avoid pet names: they're classic security-question answers", "Lifestyle");
    const interest = add(m(/\b(?:AI|ML|Web3|Crypto|Blockchain|Data Science|Startups?|Trading|Investing|Stocks)\b(?:\s?(?:&|and|\/)\s?[A-Z][\w]*)?/), 8, "your interests", "Keep interests vague: they make fake 'opportunities' feel tailored", "Lifestyle");

    const v = (p, f) => (p ? p.text : f);
    const uses = (...ps) => ps.filter(Boolean).map((p) => p.text);
    const ctx = branch || role || interest, org = college || employer, place = hostel || city;
    const attacks = [
      { type: "dm", title: "Fake DM", subtitle: employer && !college ? "Fake colleague asking for help" : "Fake senior asking for UPI help",
        message: `Hey ${v(name, "there")}! Saw your profile${ctx ? ` (${ctx.text})` : ""}${place ? `, you're in ${place.text} right?` : "."} I'm from ${v(org, "your circle")} too. Stuck outside rn and my UPI isn't working. Could you send ₹2,000? I'll return it tomorrow 🙏`,
        uses: uses(name, ctx, place, org) },
      { type: "boss", title: "Boss WhatsApp", subtitle: employer && !college ? "CEO fraud / urgent request" : "Fake internship / placement update",
        message: `Hi ${v(name, "there")}, this is from the ${v(org, "placement")} team. We're shortlisting profiles${interest ? ` in ${interest.text}` : ""} for a special opportunity. Share your updated resume and the OTP you'll receive to confirm your slot today. Keep this confidential.`,
        uses: uses(name, org, interest) },
      { type: "call", title: "Call Script", subtitle: child ? "Fake emergency about your child" : "Fake delivery / OTP verification",
        message: child
          ? `Hello ${v(name, "there")}, calling about ${child.text}${city ? ` in ${city.text}` : ""}. There's been a small accident, nothing serious, but the hospital needs a ₹5,000 deposit on UPI before treatment. Please hurry.`
          : `Hello ${v(name, "there")}, courier desk here. Your parcel to ${v(place, "your address")} is on hold due to an address issue${pet ? ` (the order for ${pet.text})` : ""}. Please read out the OTP I'm sending so we can deliver today.`,
        uses: child ? uses(name, child, city) : uses(name, place, pet) }
    ];
    return { phrases: found, attacks };
  }

  // ---------- fetching ----------
  async function fetchLive(bio) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch("/api/attack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio }), signal: ctrl.signal });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // ---------- terminal ----------
  function tline(html, cls = "") {
    const d = document.createElement("div"); d.className = `l ${cls}`; d.innerHTML = html;
    const tb = $("#termBody"); const cur = tb.querySelector(".cursor-line"); tb.insertBefore(d, cur);
  }
  async function runTerminal(promise, bio) {
    $("#termBody").innerHTML = `<div class="cursor-line"><span class="g">$</span> <span class="cursor"></span></div>`;
    tline(`<span class="g">$</span> clone-attack --target "${esc(bio.slice(0, 38))}${bio.length > 38 ? "…" : ""}"`);
    await sleep(250); tline(`<span class="m">[*] loading public footprint · ${bio.length} chars</span>`);
    await sleep(250); tline(`<span class="m">[*] running entity extraction…</span>`);
    const data = await promise;
    for (const p of [...data.phrases].sort((a, b) => b.weight - a.weight)) {
      await sleep(170);
      const c = catOf(p);
      tline(`<span class="r">[+]</span> <span style="color:${CATS[c].c}">${c.toUpperCase().padEnd(9, " ")}</span> ${esc(p.text)} <span class="y">+${p.weight}</span>`);
    }
    await sleep(200); tline(`<span class="m">[*] cross-linking ${data.phrases.length} details → attack vectors…</span>`);
    for (const a of data.attacks) { await sleep(180); tline(`<span class="c">[⚡]</span> ${esc(a.title)} <span class="m">· ${esc(a.subtitle || "")}</span>`); }
    await sleep(250); tline(`<span class="g">[✓] dossier ready. stamping SIMULATION.</span>`);
    await sleep(350);
    return data;
  }

  // ---------- generate ----------
  async function generate() {
    const bio = bioEl.value.trim();
    if (bio.length < 10) { toast("Paste a bit more, at least one line of your bio."); bioEl.focus(); return; }
    $("#genBtn").disabled = true; $("#genLabel").textContent = "Attacking…";
    $("#empty").classList.add("hidden"); $("#scoreCard").classList.add("hidden"); $("#results").classList.add("hidden");
    $("#term").classList.remove("hidden");

    const sample = Object.values(window.SAMPLES).find((s) => s.bio.trim() === bio);
    let source = "sample";
    const p = sample ? Promise.resolve(JSON.parse(JSON.stringify(sample.data)))
      : fetchLive(bio).then((d) => { source = "ai"; if (!d.phrases || !d.phrases.length) throw 0; return d; })
          .catch(() => { source = "offline"; return offlineAnalyze(bio); });
    const data = await runTerminal(p, bio);

    state.data = data; state.source = source; state.bio = bio; state.hidden = new Set(); state.view = 0; state.animated = new Set();
    state.base = Math.min(96, Math.max(8, data.phrases.reduce((a, x) => a + x.weight, 0)));
    $("#engine").textContent = source === "ai" ? "AI ENGINE · LIVE" : source === "offline" ? "OFFLINE ENGINE" : "DEMO PERSONA";
    $("#sourceNote").textContent = source === "ai" ? "// generated live by AI" : source === "offline" ? "// generated by built-in offline engine" : "// sample persona · pre-generated";

    $("#term").classList.add("hidden");
    $("#scoreCard").classList.remove("hidden"); $("#results").classList.remove("hidden");
    $("#genBtn").disabled = false; $("#genLabel").textContent = "Launch Clone Attack";
    shown = 0; render();
    if (window.innerWidth < 1180) $("#scoreCard").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- scoring ----------
  const activeW = (list) => list.filter((p) => !state.hidden.has(p.text)).reduce((a, p) => a + p.weight, 0);
  function currentScore() {
    const ps = state.data.phrases, total = ps.reduce((a, p) => a + p.weight, 0);
    if (!total) return state.base;
    const floor = Math.min(6, state.base);
    return Math.round(floor + (state.base - floor) * (activeW(ps) / total));
  }
  const level = (s) => (s >= 60 ? ["Highly cloneable", "t-high", "#E11D48"] : s >= 35 ? ["Moderately cloneable", "t-med", "#D97706"] : ["Hard to clone", "t-low", "#16A34A"]);
  function sevOf(a) {
    const w = a.uses.filter((u) => !state.hidden.has(u)).reduce((s, u) => s + ((state.data.phrases.find((p) => p.text === u) || {}).weight || 0), 0);
    return w >= 30 ? ["High", "t-high", "#E11D48"] : w >= 14 ? ["Medium", "t-med", "#D97706"] : ["Low", "t-low", "#16A34A"];
  }
  let shown = 0;
  function animateNumber(el, from, to) {
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ---------- text marking ----------
  function marked(text, mode) {
    const ps = state.data.phrases.map((p) => p.text).sort((a, b) => b.length - a.length);
    if (!ps.length) return esc(text);
    return text.split(new RegExp(`(${ps.map(reEsc).join("|")})`, "g")).map((part) => {
      const p = state.data.phrases.find((x) => x.text === part);
      if (!p) return esc(part);
      if (state.hidden.has(p.text)) return mode === "bio" ? `<span class="pill-h" data-ph="${esc(p.text)}" title="Click to restore">🔒 hidden</span>` : `<span class="gen">${esc(p.generic)}</span>`;
      return `<mark class="ex" data-ph="${esc(p.text)}">${esc(p.text)}</mark>`;
    }).join("");
  }

  function saferBio() {
    let s = state.bio;
    const nameP = state.data.phrases.find((p) => catOf(p) === "Identity" && state.hidden.has(p.text));
    if (nameP) { const segs = s.split("|"); if (segs[0].includes(nameP.text)) { segs[0] = ` ${nameP.text[0]}. `; s = segs.join("|"); } }
    for (const p of state.data.phrases) if (state.hidden.has(p.text)) s = s.split(p.text).join("\u0000");
    s = s.replace(/\(\s*[\u0000\s,&]*\)/g, "")
      .replace(/(?:@|\bat\b|\bof\b|\bto\b|\bnamed\b)\s*\u0000/gi, "\u0000")
      .replace(/\u0000(\s*[,&]\s*\u0000)+/g, "\u0000")
      .replace(/\u0000\s*[,&]?/g, "")
      .replace(/\s*[,&]\s*(?=\||$)/g, "")
      .replace(/\|\s*(?:[^\w|]*\s*)\|/g, "|");
    s = s.replace(/\(\s*([^()]*?)\s*,\s*\)/g, "($1)").replace(/\(\s*,\s*([^()]*?)\)/g, "($1)");
    s = s.split("|").map((x) => x.trim().replace(/^[^\p{L}\p{N}]+(?=\p{L})/u, "")).filter((x) => x && /[\p{L}\p{N}]/u.test(x) && !/^(proud|weekend|ex-intern|enthusiast|nerd|lover|fan)\b\s*\W*$/i.test(x)).join(" | ");
    return s.replace(/\s{2,}/g, " ").trim();
  }

  // ---------- attack map (SVG) ----------
  function renderMap() {
    const { phrases, attacks } = state.data;
    const L = [...phrases].sort((a, b) => Object.keys(CATS).indexOf(catOf(a)) - Object.keys(CATS).indexOf(catOf(b)));
    const W = 640, rowH = 40, top = 10;
    const H = Math.max(L.length * rowH + 20, attacks.length * 110 + 20);
    const ly = (i) => top + i * rowH + 15 + (H - 20 - L.length * rowH) / 2;
    const ry = (i) => top + (i + 0.5) * ((H - 20) / attacks.length);
    let links = "", lnodes = "", rnodes = "";
    attacks.forEach((a, j) => {
      a.uses.forEach((u) => {
        const i = L.findIndex((p) => p.text === u); if (i < 0) return;
        const off = state.hidden.has(u), col = CATS[catOf(L[i])].c;
        links += `<path class="link" d="M 238 ${ly(i)} C 330 ${ly(i)}, 330 ${ry(j)}, 420 ${ry(j)}" fill="none" stroke="${off ? "#C9CCDA" : col}" stroke-width="${off ? 1 : 2}" stroke-opacity="${off ? 0.35 : 0.65}" ${off ? 'stroke-dasharray="4 5"' : ""}/>`;
      });
    });
    L.forEach((p, i) => {
      const off = state.hidden.has(p.text), c = CATS[catOf(p)], y = ly(i);
      const label = p.text.length > 22 ? p.text.slice(0, 21) + "…" : p.text;
      lnodes += `<g class="node" data-ph="${esc(p.text)}" opacity="${off ? 0.4 : 1}">
        <rect x="4" y="${y - 15}" width="234" height="30" rx="9" fill="${off ? "#F7F8FC" : c.c + "14"}" stroke="${off ? "#C9CCDA" : c.c}" stroke-opacity=".6"/>
        <text x="16" y="${y + 5}" font-size="13" fill="#151827" font-family="Inter" ${off ? 'text-decoration="line-through"' : ""}>${c.i} ${esc(label)}</text>
        <text x="228" y="${y + 5}" font-size="11" text-anchor="end" fill="${off ? "#15803D" : "#5F6480"}" font-family="JetBrains Mono, monospace">${off ? "cut" : "+" + p.weight}</text></g>`;
    });
    const ICON = { dm: "💬", boss: "💼", call: "📞" };
    attacks.forEach((a, j) => {
      const [sv, , col] = sevOf(a), y = ry(j), live = a.uses.filter((u) => !state.hidden.has(u)).length;
      rnodes += `<g class="anode" data-view="${j}" style="cursor:pointer">
        <rect x="420" y="${y - 32}" width="216" height="64" rx="12" fill="${col}0F" stroke="${col}" stroke-opacity=".6"/>
        <text x="436" y="${y - 7}" font-size="14" font-weight="700" fill="#151827" font-family="Inter">${ICON[a.type] || "⚡"} ${esc(a.title)}</text>
        <text x="436" y="${y + 15}" font-size="11.5" fill="${col}" font-family="JetBrains Mono, monospace">${sv.toUpperCase()} · ${live} detail${live === 1 ? "" : "s"} feeding</text></g>`;
    });
    $("#mapSvg").innerHTML = `<svg viewBox="0 0 ${W} ${H}">${links}${lnodes}${rnodes}</svg>`;
    $("#legend").innerHTML = Object.entries(CATS).map(([k, v]) => `<span><i style="background:${v.c}"></i>${k}</span>`).join("");
  }

  // ---------- phone ----------
  function renderPhone() {
    const a = state.data.attacks[state.view]; if (!a) return;
    const ph = PHONES[a.type] || PHONES.dm, msg = marked(a.message, "msg");
    const key = state.view, first = !state.animated.has(key);
    const time = "9:41";
    let inner;
    if (a.type === "call") {
      inner = `<div class="sbar"><span>${time}</span><span>📶 🔋</span></div>
        <div class="call-top"><div class="av">?</div><b>${ph.who}</b><small>${ph.sub}</small><small style="margin-top:8px;color:#FF7A93">⚠ Suspected spam</small></div>
        <div class="transcript" id="bubbleSlot"></div>
        <div class="call-btns"><i style="background:#EF4444">✕</i><i style="background:#22C55E">✆</i></div>`;
    } else {
      inner = `<div class="sbar"><span>${time}</span><span>📶 🔋</span></div>
        <div class="chead"><div class="av" style="background:${ph.av}">${a.type === "dm" ? "C" : "?"}</div><div><b>${ph.who}</b><small>${ph.sub}</small></div></div>
        <div class="cbody" id="bubbleSlot"></div>`;
    }
    $("#phone").innerHTML = `<div class="phone ${ph.cls}"><div class="screen"><div class="notch"></div>${inner}<span class="sim">SIMULATION · ${ph.app.toUpperCase()}</span></div></div>`;
    const slot = $("#bubbleSlot");
    const fill = () => {
      if (a.type === "call") slot.innerHTML = `<div style="font-size:10.5px;opacity:.6;margin-bottom:4px">LIVE TRANSCRIPT</div>${msg}`;
      else slot.innerHTML = `<div class="bub">${msg}<span class="time">${time} PM</span></div>`;
    };
    if (first) {
      state.animated.add(key);
      slot.innerHTML = a.type === "call" ? `<div style="opacity:.6;font-size:12px">Ringing…</div>` : `<div class="typing" style="background:${a.type === "dm" ? "#262626" : "#202C33"}"><i></i><i></i><i></i></div>`;
      setTimeout(() => { if (state.view === key) fill(); }, 800);
    } else fill();

    // flags
    const flags = TACTICS.filter((t) => (t.test ? t.test(a) : t.re.test(a.message)));
    $("#flags").innerHTML = `<div class="kicker" style="color:#E11D48">⚑ ${flags.length} manipulation tactics detected</div>` +
      flags.map((t, i) => `<div class="flag" style="animation-delay:${i * 60}ms"><div class="ic">${t.i}</div><div><b>${t.k}</b><p>${esc(t.why(a))}</p></div></div>`).join("");
    $("#verify").innerHTML = `<b>✓ What to do instead:</b> ${VERIFY[a.type] || VERIFY.dm}`;

    $("#vtabs").innerHTML = state.data.attacks.map((x, i) => {
      const [sv, , col] = sevOf(x);
      return `<button class="vtab ${i === state.view ? "on" : ""}" data-view="${i}"><span class="dot" style="background:${col}"></span>${esc(x.title)} · ${sv}</button>`;
    }).join("");
  }

  // ---------- full render ----------
  function render() {
    const d = state.data, score = currentScore(), [tag, cls, color] = level(score);
    const arc = $("#arc"); arc.setAttribute("stroke-dasharray", `${score} 100`); arc.setAttribute("stroke", color); arc.style.color = color;
    animateNumber($("#scoreNum"), shown, score); shown = score;
    $("#scoreTag").className = `tag ${cls}`; $("#scoreTag").textContent = tag;
    $("#beforeNum").textContent = state.base; $("#afterNum").textContent = score;
    $("#afterNum").style.color = color;
    const gain = state.base ? Math.round(((state.base - score) / state.base) * 100) : 0;
    $("#gainText").textContent = state.hidden.size ? (gain > 0 ? `▼ ${gain}% harder to clone. ${state.hidden.size} detail${state.hidden.size > 1 ? "s" : ""} cut off.` : "") : "Tip: click any red detail to cut it off.";

    // category bars
    const totals = {};
    d.phrases.forEach((p) => { const c = catOf(p); totals[c] = totals[c] || { all: 0, live: 0 }; totals[c].all += p.weight; if (!state.hidden.has(p.text)) totals[c].live += p.weight; });
    const maxAll = Math.max(1, ...Object.values(totals).map((t) => t.all));
    $("#cats").innerHTML = Object.entries(CATS).filter(([k]) => totals[k]).map(([k, v]) =>
      `<div class="cat-row"><span>${v.i} ${k}</span><div class="bar"><i style="width:${(totals[k].live / maxAll) * 100}%;background:${v.c}"></i></div><span>${totals[k].live}</span></div>`).join("");

    renderMap();
    renderPhone();
    $("#bioView").innerHTML = d.phrases.length ? marked(state.bio, "bio") : `${esc(state.bio)}<div style="color:#15803D;font-size:13px">Nice, nothing specific to exploit.</div>`;

    $("#fixCount").textContent = `${state.hidden.size}/${d.phrases.length}`;
    $("#fixes").innerHTML = [...d.phrases].sort((a, b) => b.weight - a.weight).map((p) => {
      const done = state.hidden.has(p.text), c = CATS[catOf(p)];
      return `<label class="fix ${done ? "done" : ""}"><input type="checkbox" data-fix="${esc(p.text)}" ${done ? "checked" : ""}>
        <div><div class="ft">${esc(p.fix)}</div><small>${c.i} ${esc(p.text)}</small></div><span class="pts">−${p.weight}</span></label>`;
    }).join("") + `<p class="sub" style="margin-top:10px">Real scam message? Call <b style="color:var(--text)">1930</b> or report on Chakshu.</p>`;

    $("#safer").textContent = state.hidden.size ? saferBio() : "Cut off details (or hit 🔒 Lock down) and your privacy-safe bio appears here.";
    $("#copyBtn").disabled = !state.hidden.size;
  }

  function toggle(ph) { if (!ph) return; state.hidden.has(ph) ? state.hidden.delete(ph) : state.hidden.add(ph); render(); }

  // ---------- events ----------
  document.addEventListener("click", (e) => {
    const n = e.target.closest("[data-ph]"); if (n && (n.closest("#bioView") || n.closest("#mapSvg"))) return toggle(n.dataset.ph);
    const v = e.target.closest("[data-view]"); if (v && state.data) { state.view = +v.dataset.view; renderPhone(); if (v.closest("#mapSvg") && window.innerWidth < 1180) $("#phone").scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
  $("#fixes").addEventListener("change", (e) => { if (e.target.dataset.fix) toggle(e.target.dataset.fix); });
  $("#resetBtn").addEventListener("click", () => { state.hidden.clear(); render(); });
  $("#lockBtn").addEventListener("click", async () => {
    const order = [...state.data.phrases].sort((a, b) => b.weight - a.weight).filter((p) => !state.hidden.has(p.text));
    for (const p of order) { state.hidden.add(p.text); render(); await sleep(260); }
    toast("🔒 Locked down. Scammers now have almost nothing to work with.");
  });
  $("#copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#safer").textContent); toast("Safer bio copied ✓"); }
    catch { toast("Select the text and copy it manually."); }
  });
  $("#genBtn").addEventListener("click", generate);
  bioEl.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); });

  setPersona("student");
  window.__offlineAnalyze = offlineAnalyze;
  window.__state = state;
})();
