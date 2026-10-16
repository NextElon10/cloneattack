# Clone Attack: The Digital Doppelgänger

Paste your public bio → see the scams written for you → hide details and watch your Cloneability drop.

## Run locally (no setup)
Open `index.html` via any static server:
```
python3 -m http.server 8000   # then open http://localhost:8000
```
Samples work instantly. Custom bios use the built-in offline analyzer (no API needed).

## Deploy with live AI (Vercel)
```
npm i -g vercel
vercel                       # from this folder
vercel env add GROQ_API_KEY  # or GEMINI_API_KEY
vercel --prod
```
`/api/attack.js` holds the key server-side. If the AI fails or times out, the app falls back to the offline analyzer automatically.

## Files
- `index.html`: UI
- `style.css`: compiled Tailwind (no CDN needed)
- `app.js`: logic, scoring, offline analyzer
- `samples.js`: 3 cached personas
- `api/attack.js`: Vercel function (Groq or Gemini)
