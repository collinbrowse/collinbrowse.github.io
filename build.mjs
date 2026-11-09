// Builds the site from content/*.json into dist/. No dependencies: `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const site = read('content/site.json');
const order = ['silver-screen', 'crewcue', 'cash-flow'];
const apps = readdirSync(join(root, 'content/apps')).filter((f) => f.endsWith('.json')).map((f) => read(`content/apps/${f}`))
  .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const has = (p) => p && existsSync(join(root, 'site', p));
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
const versionOf = (a) => a.release.version ? `${a.release.version}${a.release.build ? ` (${a.release.build})` : ''}` : 'pre-release';

// Cash Flow has no icon yet, so the site draws a simple mark for it.
const icon = (a, base, cls = '') => has(a.icon)
  ? `<img class="app-icon ${cls}" src="${base}${a.icon}" alt="" width="84" height="84">`
  : `<span class="mark ${cls === 'lg' ? '' : 'sm'}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 3 8-9"/><path d="M15 6h5v5"/></svg></span>`;

const page = ({ title, description, path, scene = '', base = '', body, nav }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site.url}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site.url}${path}">
<meta name="theme-color" content="#f5f1e8">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2317160f'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='17' fill='%23f5f1e8'%3ECB%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body data-scene="${scene}">
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
  <a class="brand" href="${base || './'}">${esc(site.name)}</a>
  <nav aria-label="Primary"><ul>${nav}</ul></nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap">
  <span>© ${new Date().getUTCFullYear()} ${esc(site.name)} · ${esc(site.location)}</span>
  <span><a href="${site.links.github}">GitHub</a> · <a href="${site.links.linkedin}">LinkedIn</a>${site.links.email ? ` · <a href="mailto:${esc(site.links.email)}">Email</a>` : ''}</span>
</div></footer>
<script src="${base}assets/app.js" defer></script>
</body>
</html>
`;

const phone = (video, poster, base, cls = '') => `<div class="phone ${cls}"><video data-auto muted loop playsinline preload="metadata" src="${base}${video}" poster="${base}${poster}"></video></div>`;
const tabs = (clips, base, label) => `<div class="tabs" role="tablist" aria-label="${esc(label)}">${clips.map((c, i) =>
  `<button role="tab" aria-selected="${i === 0}" data-src="${base}${c.video}" data-poster="${base}${c.poster}" data-title="${esc(c.title)}" data-text="${esc(c.text)}">${esc(c.label)}</button>`).join('')}</div>`;
const clipList = (a) => a.clips.map((c) => ({ ...c, video: `media/${a.id}/${c.id}.mp4`, poster: `media/${a.id}/${c.id}.jpg` })).filter((c) => has(c.video));

// ---------- Interactive pieces ----------
const paceToy = `<div class="toy pace" data-pace>
  <div class="pace-top"><div><div class="cash-q">Goal finish · fictional 50 mile course</div><div class="pace-big num">11h 00m</div></div><div class="status" data-goal-out></div></div>
  <label><span>Drag your goal</span><span>8h – 15h</span></label>
  <input type="range" data-goal min="480" max="900" step="5" value="660" aria-label="Goal finish time">
  <div class="pace-chart"></div>
  <label><span>Race clock</span><span data-clock-out></span></label>
  <input type="range" data-clock min="0" max="1000" value="430" aria-label="Race clock">
  <p class="pace-next" aria-live="polite"></p>
  <table><thead><tr><th>Aid station</th><th>Mile</th><th>Pace</th><th>Arrive</th></tr></thead><tbody></tbody></table>
  <p class="toy-note">A simplified model for this page. The app's pacing engine is calibrated against real race results.</p>
</div>`;

const cashToy = `<div class="toy cash" data-cash>
  <div class="cash-q">Have I made more than I've spent?</div>
  <div class="cash-net num" aria-live="polite">+$0</div>
  <div class="cash-verdict"></div>
  <div class="cash-io"><div><span>In</span><b data-in></b></div><div><span>Out</span><b data-out></b></div></div>
  <div class="cash-chart"></div>
  <div class="tabs" role="tablist" aria-label="Range">
    <button role="tab" data-range="30" aria-selected="true">30 days</button>
    <button role="tab" data-range="90" aria-selected="false">90 days</button>
    <button role="tab" data-range="180" aria-selected="false">6 months</button>
  </div>
  <p class="toy-note">Demo data. Press and drag the chart, the way you would in the app.</p>
</div>`;

const rateToy = `<div class="toy rate" data-rate>
  <div class="rate-head"><span class="cash-q">Rate this portfolio, in half points</span><span class="rate-score">8.5</span></div>
  <input type="range" min="1" max="20" value="17" aria-label="Rating from 0.5 to 10">
  <p class="rate-say"></p>
</div>`;

const cvToy = `<div><div class="cv" data-cv>
  <div class="hud"><span>Squat · set 2 of 3</span><span data-reps>Rep 0</span></div>
  <div class="cue"><div><div class="hud" style="position:static">Knee angle</div><b data-angle>170°</b></div><span data-cue>Ready</span></div>
</div><p class="toy-note cv-note">An illustration of the idea, not footage of the app.</p></div>`;

// ---------- Home ----------
const homeNav = `<li class="hide-s"><a href="#work">Work</a></li><li><a href="#apps">Apps</a></li><li class="hide-s"><a href="#process">Process</a></li><li><a href="#contact">Contact</a></li>`;

const heroClips = apps.filter((a) => has(a.hero.video)).map((a) => ({ label: a.name, video: a.hero.video, poster: a.hero.poster, title: a.name, text: a.tagline }));

const appPanel = (a, i) => {
  const clips = clipList(a);
  const media = a.id === 'silver-screen' && clips.length
    ? `<div class="switcher" data-switcher>${phone(clips[0].video, clips[0].poster, '')}${tabs(clips, '', `${a.name} features`)}<p class="caption" aria-live="polite"><b>${esc(clips[0].title)}</b><span>${esc(clips[0].text)}</span></p></div>`
    : a.id === 'crewcue' ? paceToy : cashToy;
  const extra = a.id === 'silver-screen' ? rateToy : '';
  return `<section class="scene" id="${a.id}" data-scene-section="${a.scene}"><div class="wrap">
  <div class="panel ${i % 2 ? 'flip' : ''}">
    <div class="panel-copy reveal">
      <div class="app-id">${icon(a, '')}<div><p class="eyebrow">${esc(a.platforms)}</p><p class="status">${esc(a.name)} · <b>${esc(versionOf(a))}</b></p></div></div>
      <h2 class="h2">${esc(a.tagline)}</h2>
      <p class="lede">${esc(a.pitch)}</p>
      <ul class="ticks">${a.engineering.points.slice(0, 3).map((p) => `<li>${esc(p.title)}</li>`).join('')}</ul>
      ${extra}
      <div class="btn-row"><a class="btn" href="${a.id}/">See ${esc(a.name)}</a><a class="btn ghost" href="${a.links[0].href}">Source</a></div>
    </div>
    <div class="reveal">${media}</div>
  </div>
</div></section>`;
};

const home = page({
  title: `${site.name} — ${site.role}`, description: site.description, path: '/', nav: homeNav,
  body: `
<section class="hero"><div class="wrap">
  <div class="hero-grid">
    <div class="hero-copy">
      <p class="status where"><span class="dot"></span>${esc(site.role)} · ${esc(site.location)} · open to work</p>
      <h1 class="display">${esc(site.headline)}</h1>
      <p class="lede">${esc(site.subhead)}</p>
      <div class="btn-row"><a class="btn" href="#apps">See the apps</a><a class="btn ghost" href="${site.links.linkedin}">LinkedIn</a><a class="btn ghost" href="${site.links.github}">GitHub</a></div>
    </div>
    <div class="hero-device">${heroClips.length ? `<div class="switcher" data-switcher>${phone(heroClips[0].video, heroClips[0].poster, '')}${heroClips.length > 1 ? tabs(heroClips, '', 'Apps') : ''}</div>` : ''}</div>
  </div>
  <div class="stats">${site.stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><i>${esc(s.unit)}</i><p>${esc(s.label)}</p></div>`).join('')}</div>
</div></section>

<section class="scene" id="work" data-scene-section="amv"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">${esc(site.amv.company)} · ${esc(site.amv.dates)}</p><h2 class="h2">Software that watches you move, and tells you how you did.</h2><p class="lede">${esc(site.amv.summary)}</p></div>
  <div class="amv-grid">
    <div>${site.amv.products.map((p) => `<article class="product reveal">
      <div class="product-head"><h3 class="h3">${esc(p.name)}</h3><span class="status">${esc(p.role)} · ${esc(p.dates)}</span></div>
      <p>${esc(p.pitch)}</p>
      <ul class="ticks">${p.points.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </article>`).join('')}
      <div class="btn-row" style="margin-top:8px"><a class="btn" href="amv/">Read the case study</a><a class="btn ghost" href="${site.amv.products[0].store}">ConnEx on the App Store</a></div>
    </div>
    <div class="reveal">${cvToy}</div>
  </div>
</div></section>

<div id="apps">${apps.map(appPanel).join('\n')}</div>

<section class="scene" id="process" data-scene-section="ink"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">How I build now</p><h2 class="h2">${esc(site.process.title)}</h2><p class="lede">${esc(site.process.intro)}</p></div>
  <ol class="steps reveal">${site.process.steps.map((s, i, all) => `<li class="step ${i === all.length - 1 ? 'human' : ''}"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>
  <div class="meta-box reveal">
    <div><h3 class="h3">This page keeps itself current</h3><p class="muted" style="margin-top:8px">${esc(site.process.meta)}</p></div>
    <ul class="versions">${apps.map((a) => `<li><span>${esc(a.name)}</span><span class="mono muted">${esc(versionOf(a))}${a.release.date ? ` · ${fmtDate(a.release.date)}` : ''}</span></li>`).join('')}</ul>
  </div>
</div></section>

<section class="scene" id="contact" data-scene-section=""><div class="wrap">
  <div class="contact reveal">
    <p class="eyebrow">Hire me</p>
    <h2 class="h2">Looking for an iOS engineer who can own the whole product?</h2>
    <p class="lede">I'm looking for a senior iOS or mobile role, remote or in Colorado. I do my best work where one engineer is trusted with architecture, releases and the judgment calls in between.</p>
    <div class="btn-row">${site.links.email ? `<a class="btn" href="mailto:${esc(site.links.email)}">Email me</a>` : ''}<a class="btn${site.links.email ? ' ghost' : ''}" href="${site.links.linkedin}">Message me on LinkedIn</a><a class="btn ghost" href="${site.links.github}">GitHub</a></div>
  </div>
  <div class="cols reveal" style="margin-top:clamp(40px,6vw,72px)">
    ${site.skills.map((g) => `<div><h3>${esc(g.group)}</h3><ul>${g.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
  </div>
  <div class="cols reveal" style="margin-top:40px">
    <div style="grid-column:1/-1"><h3>Earlier</h3><ul class="timeline">${site.earlier.map((e) => `<li><span>${esc(e.role)}, ${esc(e.org)}</span><span class="muted">${esc(e.when)}</span></li>`).join('')}<li><span>${esc(site.education)}</span><span></span></li></ul></div>
  </div>
</div></section>`,
});

// ---------- App pages ----------
const subNav = (id) => `<li class="hide-s"><a href="../#work">Work</a></li>${apps.map((a) => `<li${a.id === id ? '' : ' class="hide-s"'}><a href="../${a.id}/"${a.id === id ? ' aria-current="page"' : ''}>${esc(a.name)}</a></li>`).join('')}<li><a href="../#contact">Contact</a></li>`;

const appPage = (a) => {
  const base = '../';
  const clips = clipList(a);
  const heroMedia = has(a.hero.video) ? phone(a.hero.video, a.hero.poster, base)
    : has(a.hero.image) ? `<div class="phone"><img src="${base}${a.hero.image}" alt="${esc(a.hero.alt || a.name)}"></div>` : '';
  const toy = a.id === 'crewcue' ? paceToy : a.id === 'cash-flow' ? cashToy : '';
  const shots = a.features.filter((f) => has(f.image));
  const plain = a.features.filter((f) => !has(f.image));
  return page({
    title: `${a.name} — ${a.tagline}`, description: a.pitch, path: `/${a.id}/`, scene: a.scene, base, nav: subNav(a.id),
    body: `
<section class="app-hero"><div class="wrap">
  <div class="hero-grid">
    <div class="hero-copy">
      <a class="back" href="../">← ${esc(site.name)}</a>
      <div class="app-id">${icon(a, base, 'lg')}<div><p class="eyebrow">${esc(a.name)} · ${esc(a.platforms)}</p><p class="status">${esc(a.status)}</p></div></div>
      <h1 class="display">${esc(a.tagline)}</h1>
      <p class="lede">${esc(a.pitch)}</p>
      ${a.privacy ? `<p class="muted">${esc(a.privacy)}</p>` : ''}
      <div class="btn-row">${a.links.map((l, i) => `<a class="btn${i ? ' ghost' : ''}" href="${l.href}">${esc(l.label)}</a>`).join('')}</div>
    </div>
    <div class="hero-device">${heroMedia}</div>
  </div>
</div></section>

${clips.length ? `<section class="scene"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">Take the tour</p><h2 class="h2">${esc(a.subtitle)}</h2></div>
  <div class="switcher reveal" data-switcher>${tabs(clips, base, 'Features')}${phone(clips[0].video, clips[0].poster, base)}<p class="caption" aria-live="polite"><b>${esc(clips[0].title)}</b><span>${esc(clips[0].text)}</span></p></div>
</div></section>` : ''}

${shots.length ? `<section class="scene"><div class="wrap"><div class="shots">${shots.map((f) => `<figure class="shot reveal"><img loading="lazy" src="${base}${f.image}" alt="${esc(a.name)}: ${esc(f.title)}" width="600" height="1304"><figcaption><h3 class="h3">${esc(f.title)}</h3><p>${esc(f.text)}</p></figcaption></figure>`).join('')}</div></div></section>` : ''}

${plain.length ? `<section class="scene"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">What it does</p><h2 class="h2">${esc(a.subtitle)}</h2></div>
  <div class="feature-grid reveal">${plain.map((f) => `<div class="feature"><h3 class="h3">${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join('')}</div>
</div></section>` : ''}

${toy ? `<section class="scene"><div class="wrap"><div class="panel">
  <div class="panel-copy reveal"><p class="eyebrow">Try it</p><h2 class="h2">${esc(a.try.title)}</h2><p class="lede">${esc(a.try.text)}</p></div>
  <div class="reveal">${toy}</div>
</div></div></section>` : ''}

<section class="scene" data-scene-section="ink"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">Under the hood · for engineers</p><h2 class="h2">How ${esc(a.name)} is built</h2><p class="lede">${esc(a.engineering.intro)}</p></div>
  <div class="facts reveal">${a.engineering.facts.map((f) => `<div class="fact"><b>${esc(f.k)}</b><span>${esc(f.v)}</span></div>`).join('')}</div>
  <div class="points reveal">${a.engineering.points.map((p) => `<div><h3 class="h3">${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('')}</div>
  <ul class="chips reveal" style="margin-top:32px">${a.engineering.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
</div></section>

<section class="scene" data-scene-section="${a.scene}"><div class="wrap">
  <div class="release reveal">
    <p class="eyebrow">Latest build</p>
    <h2 class="h3">${esc(a.name)} ${esc(versionOf(a))}${a.release.date ? ` <span class="muted" style="font-weight:400">· ${fmtDate(a.release.date)}</span>` : ''}</h2>
    ${a.release.notes.length ? `<ul class="ticks">${a.release.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : `<p class="muted">${esc(a.status)}.</p>`}
    <div class="btn-row">${a.links.map((l) => `<a class="btn ghost" href="${l.href}">${esc(l.label)}</a>`).join('')}</div>
  </div>
  <p class="muted" style="margin-top:28px">Built by <a href="../">${esc(site.name)}</a>. <a href="../#contact">Get in touch</a>.</p>
</div></section>`,
  });
};

// ---------- AMV case study ----------
const amvPage = page({
  title: `${site.amv.company} — case study`, description: site.amv.summary, path: '/amv/', scene: 'amv', base: '../', nav: subNav(''),
  body: `
<section class="app-hero"><div class="wrap">
  <div class="hero-grid">
    <div class="hero-copy">
      <a class="back" href="../">← ${esc(site.name)}</a>
      <p class="eyebrow">${esc(site.amv.company)} · ${esc(site.amv.title)} · ${esc(site.amv.dates)}</p>
      <h1 class="display">From clinic iPads to a camera that coaches your squat.</h1>
      <p class="lede">${esc(site.amv.summary)}</p>
    </div>
    <div class="hero-device">${cvToy}</div>
  </div>
</div></section>
${site.amv.products.map((p) => `<section class="scene"><div class="wrap">
  <div class="scene-head reveal"><p class="eyebrow">${esc(p.role)} · ${esc(p.dates)}</p><h2 class="h2">${esc(p.name)}</h2><p class="lede">${esc(p.pitch)}</p></div>
  <ul class="ticks reveal" style="max-width:46em;gap:14px">${p.points.map((x) => `<li style="color:var(--fg)">${esc(x)}</li>`).join('')}</ul>
  <ul class="chips reveal" style="margin-top:28px">${p.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  <div class="btn-row reveal" style="margin-top:24px"><a class="btn" href="${p.store}">View on the App Store</a></div>
</div></section>`).join('\n')}
<section class="scene"><div class="wrap"><p class="muted" style="max-width:46em">${esc(site.amv.also)} The code for these apps belongs to the company, so this page describes the work instead of showing it. I'm glad to walk through the architecture in an interview.</p>
<div class="btn-row" style="margin-top:24px"><a class="btn" href="../#contact">Get in touch</a><a class="btn ghost" href="../#apps">See my own apps</a></div></div></section>`,
});

// ---------- Write ----------
const out = process.env.OUT || join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
const write = (p, html) => { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), html); };
write('index.html', home);
write('amv/index.html', amvPage);
for (const a of apps) write(`${a.id}/index.html`, appPage(a));
write('404.html', page({ title: 'Not found', description: '', path: '/404.html', base: '/', nav: homeNav.replaceAll('href="#', 'href="/#'), body: `<section class="hero"><div class="wrap"><h1 class="display">That page isn't here.</h1><p class="lede" style="margin-top:20px"><a href="/">Back to the start</a>.</p></div></section>` }));
write('.nojekyll', '');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/amv/', ...apps.map((a) => `/${a.id}/`)].map((p) => `<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${apps.length + 3} pages into dist/`);
