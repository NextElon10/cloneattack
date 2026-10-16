(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const state = { data: null, hidden: new Set(), base: 0, persona: "student", source: "" };

  const bioEl = $("#bio");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ---------- toast ----------
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.remove("opacity-0", "translate-y-4");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.add("opacity-0", "translate-y-4"), 3200);
  }

  // ---------- input side ----------
  function setPersona(key) {
    state.persona = key;
    $$(".persona").forEach((b) => {
      const on = b.dataset.p === key;
      b.classList.toggle("active", on);
      b.querySelector("div").classList.toggle("text-brand", on);
    });
    bioEl.value = window.SAMPLES[key].bio;
    updateCount();
  }
  function updateCount() { $("#count").textContent = bioEl.value.length; }

  $$(".persona").forEach((b) => b.addEventListener("click", () => setPersona(b.dataset.p)));
  bioEl.addEventListener("input", updateCount);
  $("#clearBtn").addEventListener("click", () => { bioEl.value = ""; updateCount(); bioEl.focus(); });

  $$(".mode-tab").forEach((t) => t.addEventListener("click", () => {
    const own = t.dataset.mode === "own";
    $$(".mode-tab").forEach((x) => {
      const on = x === t;
      x.classList.toggle("bg-white", on); x.classList.toggle("shadow-sm", on);
      x.classList.toggle("tab-active", on); x.classList.toggle("border-transparent", !on);
      x.classList.toggle("text-ink/60", !on);
    });
    $("#personaWrap").classList.toggle("hidden", own);
    if (own) { bioEl.value = ""; updateCount(); bioEl.focus(); }
    else setPersona(state.persona);
  }));

  // ---------- offline analyzer (never-fail fallback) ----------
  const CITIES = ["New Delhi","Delhi","Mumbai","Bangalore","Bengaluru","Pune","Hyderabad","Chennai","Kolkata","Ahmedabad","Jaipur","Indore","Bhopal","Lucknow","Noida","Gurgaon","Gurugram","Chandigarh","Nagpur","Surat","Kochi","Goa","Nashik","Jalgaon","Thane","Vadodara","Mysore","Mysuru","Coimbatore","Patna","Ranchi","Dehradun","Bhubaneswar","Visakhapatnam","Kanpur","Agra","Varanasi","Amritsar","Ludhiana","Guwahati","Koramangala","Indiranagar","Whitefield","Andheri","Bandra","Powai","Dwarka","Saket","Kothrud","Hinjewadi"];

  function offlineAnalyze(bio) {
    const found = [];
    const add = (text, weight, generic, fix) => {
      text = (text || "").trim().replace(/[|,.;:]+$/, "").trim();
      if (text.length < 2 || !bio.includes(text)) return null;
      if (found.some((f) => f.text.includes(text) || text.includes(f.text))) return null;
      const p = { text, weight, generic, fix };
      found.push(p);
      return p;
    };
    const m = (re) => { const r = bio.match(re); return r ? (r[1] || r[0]) : null; };

    const first = bio.split(/[|\n•·]/)[0].trim();
    const nm = first.match(/^([A-Z][a-z]{2,})(?:\s[A-Z][a-z]+)?$/);
    const name = nm ? add(nm[1], 10, "there", "Use a nickname or initial instead of your real first name") : null;

    const hostel = add(m(/\b(?:Hostel|Block|Hall|Wing)[\s-]?[A-Z0-9][\w-]*/i), 18, "your hostel", "Remove your hostel or block: it pinpoints where you live");
    const child = add(m(/\b(?:dad|mom|mum|mother|father|papa|mama)\s+(?:of|to)\s+([A-Z][a-z]+)/i), 18, "your child", "Never name your child publicly: it powers fake-emergency scams");
    const college = add(m(/\b(?:IIT|NIT|IIIT|BITS|VIT|SRM|DTU|NSUT|IIM|MIT|KIIT|LPU|Amity|Manipal)(?:\s[A-Z][a-z]+)?\b/) ||
      m(/\b(?:[A-Z][\w.&]*\s){1,4}(?:University|College|Institute(?:\sof\sTechnology)?)\b/), 16, "your college", "Hide your college name or limit it to friends-only");
    const branch = add(m(/\b(?:CSE|ECE|EEE|IT|AIML|AIDS|Mech(?:anical)?|Civil|B\.?\s?Tech|BBA|BCA|MBA|MCA|B\.?Sc|M\.?Tech|B\.?Com)\b(?:[\s-]*(?:\d(?:st|nd|rd|th)\s?(?:year|yr|sem)|'?\d{2,4}))?/) ||
      m(/\b\d(?:st|nd|rd|th)\s?(?:year|yr)\b/i), 14, "your branch", "Drop your branch and year: it lets scammers pose as 'seniors' or recruiters");
    const employer = add(m(/(?:\bat\b|@)\s*([A-Z][\w&.]*(?:\s[A-Z][\w&.]*){0,3})/), 16, "your company", "Hide your employer: it makes fake 'boss' messages believable");
    const role = add(m(/\b(?:(?:Senior|Junior|Lead|Branch|HR|Software|Product|Marketing|Sales|Finance|Bank)\s)?(?:Manager|Engineer|Developer|Founder|Co-founder|Analyst|Designer|Intern|Consultant|Recruiter|Teacher|Doctor)\b/), 10, "your role", "Your job title tells attackers what you can approve: limit who sees it");
    let city = null;
    for (const c of CITIES) { if (new RegExp(`\\b${reEsc(c)}\\b`).test(bio)) { city = add(c, 10, "your city", "Remove your city or neighbourhood from your bio"); if (city) break; } }
    const pet = add(m(/\b(?:dog|cat|puppy|pet)\s(?:lover|mom|dad|parent)\b/i) || m(/\b(?:dog|cat|retriever|labrador|beagle|pug|shih tzu|indie)\s+(?:named\s+)?([A-Z][a-z]+)/i), 6, "your pet", "Avoid pet details: they're common security-question answers");
    const interest = add(m(/\b(?:AI|ML|Web3|Crypto|Blockchain|Data Science|Startups?|Trading|Investing|Stocks)\b(?:\s?(?:&|and|\/)\s?[A-Z][\w]*)?/), 8, "your interests", "Keep interests vague: they make fake 'opportunities' feel tailored");

    const v = (p, fallback) => (p ? p.text : fallback);
    const uses = (...ps) => ps.filter(Boolean).map((p) => p.text);
    const ctx = branch || role || interest;
    const org = college || employer;
    const place = hostel || city;

    const attacks = [
      { type: "dm", title: "Fake DM", subtitle: org === employer && employer ? "Fake colleague asking for help" : "Fake senior asking for UPI help",
        message: `Hey ${v(name, "there")}! Saw your profile${ctx ? ` (${ctx.text})` : ""}${place ? `, you're in ${place.text} right?` : "."} I'm from ${v(org, "your circle")} too. Stuck outside rn and my UPI isn't working. Could you send ₹2,000? I'll return it tomorrow 🙏`,
        uses: uses(name, ctx, place, org) },
      { type: "boss", title: "Boss WhatsApp", subtitle: employer ? "CEO fraud / urgent request" : "Fake internship / placement update",
        message: `Hi ${v(name, "there")}, this is from ${v(org, "the placement")} team. We're shortlisting profiles${interest ? ` in ${interest.text}` : ""} for a special opportunity. Share your updated resume and the OTP you'll receive to confirm your slot today. Keep this confidential.`,
        uses: uses(name, org, interest) },
      { type: "call", title: "Call Script", subtitle: child ? "Fake emergency about your child" : "Fake delivery / OTP verification",
        message: child
          ? `Hello ${v(name, "there")}, calling about ${child.text}${city ? ` in ${city.text}` : ""}. There's been a small accident, nothing serious, but the hospital needs a ₹5,000 deposit on UPI before treatment. Please hurry.`
          : `Hello ${v(name, "there")}, courier desk here. Your parcel to ${v(place, "your address")} is on hold due to an address issue${pet ? ` (it's the ${pet.text} order)` : ""}. Please read out the OTP I'm sending so we can deliver today.`,
        uses: child ? uses(name, child, city) : uses(name, place, pet) }
    ];
    return { phrases: found, attacks };
  }

  // ---------- data fetching ----------
  async function fetchLive(bio) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch("/api/attack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio }), signal: ctrl.signal });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const LOAD_MSGS = ["Reading your bio like a scammer would…", "Linking names, places and routines…", "Drafting the messages you'd fall for…"];

  async function generate() {
    const bio = bioEl.value.trim();
    if (bio.length < 10) { toast("Paste a bit more: at least a line of your bio."); bioEl.focus(); return; }

    $("#genBtn").disabled = true;
    $("#genLabel").textContent = "Generating…";
    $("#empty").classList.add("hidden");
    $("#results").classList.add("hidden"); $("#results").classList.remove("flex");
    $("#loading").classList.remove("hidden");
    let i = 0; $("#loadMsg").textContent = LOAD_MSGS[0];
    const cycle = setInterval(() => { i = (i + 1) % LOAD_MSGS.length; $("#loadMsg").textContent = LOAD_MSGS[i]; }, 900);

    const sample = Object.values(window.SAMPLES).find((s) => s.bio.trim() === bio);
    let data, source;
    try {
      if (sample) {
        await sleep(1300);
        data = JSON.parse(JSON.stringify(sample.data));
        source = "sample";
      } else {
        try {
          [data] = await Promise.all([fetchLive(bio), sleep(900)]);
          source = "ai";
        } catch (e) {
          data = offlineAnalyze(bio);
          source = "offline";
          toast("AI is busy, so the built-in analyzer was used instead.");
        }
      }
      if (!data.phrases || !data.phrases.length) {
        data = offlineAnalyze(bio);
        source = "offline";
      }
    } finally {
      clearInterval(cycle);
    }

    state.data = data;
    state.source = source;
    state.hidden = new Set();
    state.base = Math.min(96, Math.max(8, data.phrases.reduce((a, p) => a + p.weight, 0) + (data.phrases.length ? 0 : 8)));

    $("#loading").classList.add("hidden");
    $("#results").classList.remove("hidden"); $("#results").classList.add("flex");
    $("#genBtn").disabled = false;
    $("#genLabel").textContent = "Generate Attack";
    $("#sourceNote").textContent = source === "ai" ? "Attacks generated live by AI." : source === "offline" ? "Attacks generated by the built-in offline analyzer." : "Sample persona: pre-generated for an instant demo.";
    switchTab("attacks");
    render(true);
    if (window.innerWidth < 1024) $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- scoring ----------
  function currentScore() {
    const ps = state.data.phrases;
    const total = ps.reduce((a, p) => a + p.weight, 0);
    if (!total) return state.base;
    const active = ps.filter((p) => !state.hidden.has(p.text)).reduce((a, p) => a + p.weight, 0);
    const floor = Math.min(8, state.base);
    return Math.round(floor + (state.base - floor) * (active / total));
  }
  const level = (s) => (s >= 60 ? ["Highly cloneable", "sev-High", "#F04438", "Your bio contains several specific details that can be used to craft convincing scams."]
    : s >= 35 ? ["Moderately cloneable", "sev-Medium", "#F79009", "Some details still give scammers a believable hook."]
    : ["Hard to clone", "sev-Low", "#12B76A", "Scammers have very little to personalise an attack with."]);

  function severity(attack) {
    const w = attack.uses.filter((u) => !state.hidden.has(u))
      .reduce((a, u) => a + ((state.data.phrases.find((p) => p.text === u) || {}).weight || 0), 0);
    return w >= 30 ? "High" : w >= 14 ? "Medium" : "Low";
  }

  let shown = 0;
  function animateNumber(el, from, to) {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 650);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- rendering ----------
  function marked(text, mode) {
    const ps = state.data.phrases.map((p) => p.text).sort((a, b) => b.length - a.length);
    if (!ps.length) return esc(text);
    const parts = text.split(new RegExp(`(${ps.map(reEsc).join("|")})`, "g"));
    return parts.map((part) => {
      const p = state.data.phrases.find((x) => x.text === part);
      if (!p) return esc(part);
      if (state.hidden.has(p.text)) {
        return mode === "bio"
          ? `<span class="hidden-pill" data-ph="${esc(p.text)}" title="Click to restore">🔒 hidden</span>`
          : `<span class="gen">${esc(p.generic)}</span>`;
      }
      return `<mark class="ex" data-ph="${esc(p.text)}" ${mode === "bio" ? 'title="Click to hide this detail"' : ""}>${esc(p.text)}</mark>`;
    }).join("");
  }

  const ICONS = {
    dm: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    boss: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>'
  };

  function render(first) {
    const d = state.data;
    const score = currentScore();
    const [tag, cls, color, desc] = level(score);

    // gauge
    const arc = $("#arc");
    arc.setAttribute("stroke-dasharray", `${score} 100`);
    arc.setAttribute("stroke", color);
    animateNumber($("#scoreNum"), first ? 0 : shown, score);
    shown = score;
    const tagEl = $("#scoreTag");
    tagEl.className = `inline-block mt-1 text-[14px] font-semibold rounded-full px-3 py-1 ${cls}`;
    tagEl.textContent = tag;
    $("#scoreDesc").textContent = desc;

    // before / after
    $("#beforeNum").textContent = state.base;
    $("#afterNum").textContent = score;
    const gain = state.base ? Math.round(((state.base - score) / state.base) * 100) : 0;
    $("#gainText").textContent = state.hidden.size
      ? (gain > 0 ? `You're ${gain}% harder to clone!` : "Keep going: hide more details")
      : "Click highlighted phrases below to lock them down";
    $("#resetBtn").classList.toggle("hidden", !state.hidden.size);

    // attacks
    $("#attackCount").textContent = d.attacks.length;
    $("#attacksView").innerHTML = d.attacks.map((a) => {
      const sev = severity(a);
      const chips = a.uses.map((u) => state.hidden.has(u)
        ? `<span class="text-[12px] rounded-full px-2.5 py-1 bg-[#ECFDF3] text-[#067647] line-through">${esc(u)}</span>`
        : `<span class="text-[12px] rounded-full px-2.5 py-1 bg-page text-ink/70">${esc(u)}</span>`).join("");
      return `<article class="rounded-xl border border-line p-4 flex flex-col">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 shrink-0 rounded-full bg-brand-light text-brand grid place-items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[a.type] || ICONS.dm}</svg></div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2"><h4 class="font-semibold text-[15px]">${esc(a.title)}</h4>
              <span class="text-[12px] font-semibold rounded-full px-2.5 py-0.5 sev-${sev}">${sev}</span></div>
            <p class="text-[12.5px] text-ink/55 mt-0.5">${esc(a.subtitle || "")}</p>
          </div>
        </div>
        <div class="msg relative mt-3 rounded-lg bg-page/70 border border-line p-3 pt-6 text-[14px] leading-relaxed flex-1">
          <span class="stamp">SIMULATION</span>${marked(a.message, "msg")}</div>
        <div class="mt-3 text-[13px] text-ink/60">Uses your:</div>
        <div class="mt-1.5 flex flex-wrap gap-1.5">${chips || '<span class="text-[12px] text-ink/40">Nothing personal</span>'}</div>
      </article>`;
    }).join("");

    // fixes
    $("#fixCount").textContent = d.phrases.length;
    $("#fixesView").innerHTML = [...d.phrases].sort((a, b) => b.weight - a.weight).map((p) => {
      const done = state.hidden.has(p.text);
      return `<label class="flex items-center gap-3 rounded-xl border ${done ? "border-[#D1FADF] bg-[#F6FEF9]" : "border-line"} p-3 cursor-pointer">
        <input type="checkbox" data-fix="${esc(p.text)}" ${done ? "checked" : ""} class="w-5 h-5 accent-[#5B4BDB]">
        <div class="flex-1 min-w-0"><div class="text-[14.5px] ${done ? "line-through text-ink/45" : ""}">${esc(p.fix)}</div>
          <div class="text-[12px] text-ink/50 mt-0.5">Exposed: <b>${esc(p.text)}</b></div></div>
        <span class="text-[12px] font-semibold ${done ? "text-[#067647]" : "text-ink/50"}">−${p.weight} pts</span>
      </label>`;
    }).join("") + `<p class="text-[13px] text-ink/50 mt-2">Got a suspicious message? Call <b>1930</b> or report it on Sanchar Saathi (Chakshu).</p>`;

    // bio
    $("#bioView").innerHTML = d.phrases.length ? marked(bioEl.value.trim(), "bio")
      : `${esc(bioEl.value.trim())}<div class="mt-2 text-[14px] text-[#067647]">Nice: we couldn't find specific personal details to exploit.</div>`;
  }

  function toggle(phrase) {
    if (!phrase) return;
    state.hidden.has(phrase) ? state.hidden.delete(phrase) : state.hidden.add(phrase);
    render(false);
  }

  $("#bioView").addEventListener("click", (e) => { const el = e.target.closest("[data-ph]"); if (el) toggle(el.dataset.ph); });
  $("#fixesView").addEventListener("change", (e) => { if (e.target.dataset.fix) toggle(e.target.dataset.fix); });
  $("#resetBtn").addEventListener("click", () => { state.hidden.clear(); render(false); });

  function switchTab(tab) {
    $$(".res-tab").forEach((t) => {
      const on = t.dataset.tab === tab;
      t.classList.toggle("tab-active", on); t.classList.toggle("border-transparent", !on); t.classList.toggle("text-ink/60", !on);
    });
    $("#attacksView").classList.toggle("hidden", tab !== "attacks");
    $("#fixesView").classList.toggle("hidden", tab !== "fixes");
    $("#fixesView").classList.toggle("flex", tab === "fixes");
  }
  $$(".res-tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  $("#stayBtn").addEventListener("click", () => {
    if (state.data) { switchTab("fixes"); $("#panel").scrollIntoView({ behavior: "smooth" }); }
    else $("#about").scrollIntoView({ behavior: "smooth" });
  });

  $("#genBtn").addEventListener("click", generate);
  bioEl.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); });

  setPersona("student");
  window.__offlineAnalyze = offlineAnalyze; // for quick testing
})();
