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
const app = Object.fromEntries(apps.map((a) => [a.id, a]));

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const has = (p) => p && existsSync(join(root, 'site', p));
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
const versionOf = (a) => a.release.version ? `${a.release.version}${a.release.build ? ` (${a.release.build})` : ''}` : 'not released yet';
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// Cash Flow has no icon yet, so the site draws a simple mark for it.
const markSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 3 8-9"/><path d="M15 6h5v5"/></svg>`;
const icon = (a, base) => has(a.icon)
  ? `<img class="app-icon" src="${base}${a.icon}" alt="" width="68" height="68">`
  : `<span class="mark" aria-hidden="true">${markSvg}</span>`;
const arrow = (flip = false) => `<svg viewBox="0 0 44 30" aria-hidden="true"${flip ? ' style="transform:scaleX(-1)"' : ''}><path d="M3 5c13-3 27 4 35 19"/><path d="M29 21l9 3 2-10"/></svg>`;

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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23111'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-weight='800' font-size='16' fill='%23fff'%3Ecb%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Caveat:wght@600&display=swap">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body data-scene="${scene}">
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
  <a class="name" href="${base || './'}">${esc(site.name)}</a>
  <nav aria-label="Primary"><ul>${nav}</ul></nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="bottom"><div class="wrap">
  <span>${esc(site.name)}, ${esc(site.location)}. Plain HTML and CSS, no framework.</span>
  <span><a href="${site.links.github}">GitHub</a> · <a href="${site.links.linkedin}">LinkedIn</a>${site.links.email ? ` · <a href="mailto:${esc(site.links.email)}">Email</a>` : ''}</span>
</div></footer>
<script src="${base}assets/app.js" defer></script>
</body>
</html>
`;

const phone = (video, poster, base, tilt = -2.5) => `<div class="phone" style="--tilt:${tilt}deg"><video data-auto muted loop playsinline preload="metadata" src="${base}${video}" poster="${base}${poster}"></video></div>`;
const clipList = (a) => a.clips.map((c) => ({ ...c, video: `media/${a.id}/${c.id}.mp4`, poster: `media/${a.id}/${c.id}.jpg` })).filter((c) => has(c.video));
const clipButtons = (clips, base, label) => `<div class="clips" role="tablist" aria-label="${esc(label)}">${clips.map((c, i) =>
  `<button role="tab" aria-selected="${i === 0}" data-src="${base}${c.video}" data-poster="${base}${c.poster}"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></button>`).join('')}</div>`;

// ---------- Things you can play with ----------
const paceToy = `<div class="pace" data-pace>
  <div class="cols wide-left">
    <div>
      <div class="slider-label"><span>Goal finish: <span class="pace-big" style="font-size:1em;letter-spacing:0"></span></span><span data-goal-out></span></div>
      <input type="range" data-goal min="480" max="900" step="5" value="660" aria-label="Goal finish time">
      <div class="pace-chart"></div>
      <div class="slider-label"><span>Race clock</span><span data-clock-out></span></div>
      <input type="range" data-clock min="0" max="1000" value="430" aria-label="Race clock">
      <p class="pace-next" aria-live="polite"></p>
    </div>
    <div>
      <table><thead><tr><th>Aid station</th><th>Mile</th><th>Pace</th><th>Arrive</th></tr></thead><tbody></tbody></table>
      <p class="fine" style="margin-top:14px">A made-up 50 mile course and a simplified model. The app's pacing engine is tested against real race results.</p>
    </div>
  </div>
</div>`;

const cashToy = `<div class="cash" data-cash>
  <div class="cash-net num" aria-live="polite">+$0</div>
  <p class="cash-verdict"></p>
  <div class="cash-io"><div><span>In</span><b data-in></b></div><div><span>Out</span><b data-out></b></div></div>
  <div class="cash-chart"><span class="note">press and drag ${arrow()}</span></div>
  <div class="pick" role="tablist" aria-label="Range" style="margin-top:14px">
    <button role="tab" data-range="30" aria-selected="true">30 days</button>
    <button role="tab" data-range="90" aria-selected="false">90 days</button>
    <button role="tab" data-range="180" aria-selected="false">6 months</button>
  </div>
  <p class="fine" style="margin-top:10px">Demo numbers, not mine.</p>
</div>`;

const rateToy = `<div class="rate" data-rate>
  <div class="slider-label"><span>Rate this site, in half points</span><span class="rate-score">8.5</span></div>
  <input type="range" min="1" max="20" value="17" aria-label="Rating from 0.5 to 10">
  <p class="rate-say"></p>
</div>`;

const cvToy = `<div class="stack tight" style="justify-items:center"><div class="cv" data-cv>
  <div class="hud"><span>Squat, set 2 of 3</span><span data-reps>Rep 0</span></div>
  <div class="cue"><div><small>Knee angle</small><b data-angle>170°</b></div><span data-cue>Ready</span></div>
</div><p class="fine" style="margin-top:14px">My sketch of the idea. Not footage of the app.</p></div>`;

// ---------- Home ----------
const homeNav = `<li><a href="#apps">Apps</a></li><li class="wide"><a href="#work">Work</a></li><li class="wide"><a href="#how">How I build</a></li><li><a href="#hi">Say hi</a></li>`;

const appLink = (a) => `<a class="applink" href="#${a.id}">${has(a.icon) ? `<img src="${a.icon}" alt="">` : `<span class="mark">${markSvg}</span>`}${esc(a.name)}</a>`;
const fill = (text) => esc(text).replace(/\{([a-z-]+)\}/g, (_, k) => k === 'amv' ? `<a href="#work">${esc(site.amv.company)}</a>` : app[k] ? appLink(app[k]) : '');

const ss = app['silver-screen'], cc = app['crewcue'], cf = app['cash-flow'];
const ssClips = clipList(ss);
const more = (a) => `<p class="links"><a class="solid" href="${a.id}/">More about ${esc(a.name)}</a><a class="go" href="${a.links[0].href}">Read the code</a></p>`;
const title = (a, base = '') => `<div class="title-row">${icon(a, base)}<p class="version">${esc(a.platforms)}<br><b>${esc(versionOf(a))}</b>${a.release.date ? `, ${fmtDate(a.release.date)}` : ''}</p></div>`;

const home = page({
  title: `${site.name}, ${site.role}`, description: site.description, path: '/', nav: homeNav,
  body: `
<section class="intro"><div class="wrap">
  <h1 class="giant">${esc(site.headline)}${site.photo ? ` <span class="me"><img src="${esc(site.photo)}" alt="Collin Browse outdoors, smiling" width="168" height="168"><span class="note">${arrow(true)} hi, that's me</span></span>` : ''}</h1>
  <div class="intro-text">
    ${site.intro.map((p) => `<p class="talk">${fill(p)}</p>`).join('\n    ')}
    <p class="talk">${esc(site.looking)} <a class="go" href="#hi">Say hi</a></p>
  </div>
</div></section>

<div id="apps">
<section class="chapter" id="silver-screen" data-scene-section="silver"><div class="wrap" data-switcher>
  <div class="cols center">
    <div class="phone-spot">
      ${ssClips.length ? phone(ssClips[0].video, ssClips[0].poster, '') : ''}
    </div>
    <div class="stack">
      ${title(ss)}
      <h2 class="big">${esc(ss.name)}</h2>
      <p class="mid">${esc(ss.tagline)}</p>
      <p class="talk">${esc(ss.pitch)} ${esc(ss.privacy)}</p>
      ${more(ss)}
    </div>
  </div>
  <div class="cols" style="margin-top:clamp(40px,6vw,80px)">
    <div class="stack">
      <p class="small-head">Pick a clip. These are recorded straight from the app.</p>
      ${clipButtons(ssClips, '', 'Silver Screen clips')}
    </div>
    <div class="stack">
      <p class="small-head">How it's built</p>
      <ul class="plain">${ss.engineering.points.slice(0, 4).map((p) => `<li><b>${esc(p.title)}.</b> ${esc(p.text.split('. ')[0].replace(/\.$/, ''))}.</li>`).join('')}</ul>
      ${rateToy}
    </div>
  </div>
</div></section>

<section class="chapter" id="crewcue" data-scene-section="crew"><div class="wrap">
  <div class="cols center">
    <div class="stack">
      ${title(cc)}
      <h2 class="big">${esc(cc.name)}</h2>
      <p class="mid">${esc(cc.subtitle)}.</p>
      <p class="talk">${esc(cc.pitch)}</p>
      ${more(cc)}
    </div>
    ${has('media/crewcue/runner.png') ? `<img class="runner" src="media/crewcue/runner.png" alt="Line drawing of a trail runner, from the app's welcome screen" loading="lazy">` : ''}
  </div>
  <p class="note" style="margin-top:clamp(36px,5vw,60px)">try it: drag the sliders ${arrow()}</p>
  ${paceToy.replace('class="pace"', 'class="pace" style="margin-top:14px"')}
  <ul class="plain" style="margin-top:clamp(28px,4vw,44px);max-width:46em">${cc.engineering.points.slice(0, 3).map((p) => `<li><b>${esc(p.title)}.</b> ${esc(p.text.split('. ')[0].replace(/\.$/, ''))}.</li>`).join('')}</ul>
</div></section>

<section class="chapter" id="cash-flow" data-scene-section="cash"><div class="wrap">
  <div class="cols wide-left">
    <div>
      ${title(cf)}
      <h2 class="mid" style="margin-top:22px">${esc(cf.name)} answers one question: ${esc(lower(cf.tagline))}</h2>
      ${cashToy}
    </div>
    <div class="stack">
      ${has(cf.hero.video) ? phone(cf.hero.video, cf.hero.poster, '', 3) : ''}
      <p class="talk" style="font-size:1.1rem">${esc(cf.privacy)} ${esc(cf.engineering.intro)}</p>
      ${more(cf)}
    </div>
  </div>
</div></section>
</div>

<section class="chapter" id="work" data-scene-section="amv"><div class="wrap">
  <div class="cols wide-left center">
    <div class="stack">
      <p class="version"><b>${esc(site.amv.company)}</b><br>${esc(site.amv.title)}, ${esc(site.amv.dates)}</p>
      <h2 class="big" style="font-size:clamp(2.4rem,6.4vw,5rem)">Before that, I taught phones to watch people exercise.</h2>
      <p class="talk">${esc(site.amv.summary)}</p>
    </div>
    ${cvToy}
  </div>
  <div class="jobs">${site.amv.products.map((p) => `<div class="job">
    <h3 class="mid" style="font-size:1.6rem">${esc(p.name)}</h3>
    <p class="soft">${esc(p.role)}, ${esc(p.dates)}</p>
    <p>${esc(p.pitch)}</p>
    <ul class="plain">${p.points.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p><a class="go" href="${p.store}">On the App Store</a></p>
  </div>`).join('')}</div>
  <p class="links" style="margin-top:clamp(28px,4vw,44px)"><a class="solid" href="amv/">The longer version</a></p>
</div></section>

<section class="chapter" id="how" data-scene-section=""><div class="wrap">
  <h2 class="big">${esc(site.process.title)}</h2>
  <p class="talk" style="margin-top:24px">${esc(site.process.intro)}</p>
  <ol class="how">${site.process.steps.map((s) => `<li><b>${esc(s.name)}.</b> ${esc(s.text)}</li>`).join('')}</ol>
  <div class="selfupdate">
    <p><b>This page updates itself the same way.</b> ${esc(site.process.meta)}</p>
    <table>${apps.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(versionOf(a))}${a.release.date ? `, ${fmtDate(a.release.date)}` : ''}</td></tr>`).join('')}</table>
  </div>
</div></section>

<section class="chapter" id="hi" style="padding-top:0"><div class="wrap">
  <div class="hello">
    <h2 class="giant">Say hi.</h2>
    <p class="talk">${esc(site.looking)} I do my best work where one engineer is trusted with the architecture, the releases and the judgment calls in between.</p>
    <p class="links">${site.links.email ? `<a class="solid" href="mailto:${esc(site.links.email)}">Email me</a>` : ''}<a class="${site.links.email ? 'go' : 'solid'}" href="${site.links.linkedin}">Message me on LinkedIn</a><a class="go" href="${site.links.github}">GitHub</a></p>
  </div>
  <div class="facts-list">
    ${site.skills.map((g) => `<p><b>${esc(g.group)}:</b> ${g.items.map(esc).join(', ')}.</p>`).join('\n    ')}
    <p><b>Earlier:</b> ${site.earlier.map((e) => `${esc(e.role)} at ${esc(e.org)} (${esc(e.when)})`).join(', ')}.</p>
    <p><b>School:</b> ${esc(site.education)}.</p>
  </div>
</div></section>`,
});

// ---------- App pages ----------
const subNav = (id) => `${apps.map((a) => `<li${a.id === id ? '' : ' class="wide"'}><a href="../${a.id}/"${a.id === id ? ' aria-current="page"' : ''}>${esc(a.name)}</a></li>`).join('')}<li class="wide"><a href="../amv/"${id === 'amv' ? ' aria-current="page"' : ''}>AMV</a></li><li><a href="../#hi">Say hi</a></li>`;

const appPage = (a) => {
  const base = '../';
  const clips = clipList(a);
  const heroMedia = has(a.hero.video) ? phone(a.hero.video, a.hero.poster, base, 3)
    : has(a.hero.image) ? `<div class="phone" style="--tilt:3deg"><img src="${base}${a.hero.image}" alt="${esc(a.hero.alt || a.name)}"></div>` : '';
  const toy = a.id === 'crewcue' ? paceToy : a.id === 'cash-flow' ? cashToy : '';
  const shots = a.features.filter((f) => has(f.image));
  const plain = a.features.filter((f) => !has(f.image));
  return page({
    title: `${a.name}: ${a.tagline}`, description: a.pitch, path: `/${a.id}/`, scene: a.scene, base, nav: subNav(a.id),
    body: `
<section class="app-top" data-scene-section="${a.scene}"><div class="wrap">
  <div class="cols center">
    <div class="stack">
      <a class="back" href="../">← back to Collin</a>
      ${title(a, base)}
      <h1 class="big">${esc(a.name)}</h1>
      <p class="mid">${esc(a.tagline)}</p>
      <p class="talk">${esc(a.pitch)}</p>
      ${a.privacy ? `<p>${esc(a.privacy)}</p>` : ''}
      <p class="soft">${esc(a.status)}.</p>
      <p class="links">${a.links.map((l, i) => `<a class="${i ? 'go' : 'solid'}" href="${l.href}">${esc(l.label)}</a>`).join('')}</p>
    </div>
    <div class="phone-spot">${heroMedia}</div>
  </div>

  ${clips.length ? `<div class="cols center" style="margin-top:clamp(72px,10vw,140px)" data-switcher>
    <div class="phone-spot">${phone(clips[0].video, clips[0].poster, base, -3)}</div>
    <div class="stack"><h2 class="mid">Take the tour</h2>${clipButtons(clips, base, 'Features')}</div>
  </div>` : ''}

  ${shots.length ? `<div class="shots" style="margin-top:clamp(72px,10vw,140px)">${shots.map((f) => `<figure class="shot"><img loading="lazy" src="${base}${f.image}" alt="${esc(a.name)}: ${esc(f.title)}" width="600" height="1304"><figcaption><h3 class="small-head">${esc(f.title)}</h3><p class="soft">${esc(f.text)}</p></figcaption></figure>`).join('')}</div>` : ''}

  ${plain.length ? `<div style="margin-top:clamp(72px,10vw,140px)">
    <h2 class="mid">What it does</h2>
    <div class="feature-list">${plain.map((f) => `<div><h3 class="small-head">${esc(f.title)}</h3><p class="soft">${esc(f.text)}</p></div>`).join('')}</div>
  </div>` : ''}

  ${toy ? `<div style="margin-top:clamp(72px,10vw,140px)">
    <h2 class="mid">${esc(a.try.title)}</h2>
    <p class="talk" style="margin:14px 0 20px">${esc(a.try.text)}</p>
    ${toy}
  </div>` : ''}
</div></section>

<section class="chapter" data-scene-section=""><div class="wrap">
  <p class="soft">For engineers</p>
  <h2 class="big" style="font-size:clamp(2.2rem,6vw,4.6rem);margin-top:6px">How ${esc(a.name)} is built</h2>
  <p class="talk" style="margin-top:22px">${esc(a.engineering.intro)}</p>
  <div class="numbers">${a.engineering.facts.map((f) => `<div><b>${esc(f.k)}</b>${esc(f.v)}</div>`).join('')}</div>
  <div class="feature-list">${a.engineering.points.map((p) => `<div><h3 class="small-head">${esc(p.title)}</h3><p class="soft">${esc(p.text)}</p></div>`).join('')}</div>
  <p class="stackline">Built with ${a.engineering.stack.map(esc).join(', ')}.</p>

  <div class="build" style="margin-top:clamp(48px,7vw,88px)">
    <h2 class="small-head">Latest build: ${esc(versionOf(a))}${a.release.date ? `, ${fmtDate(a.release.date)}` : ''}</h2>
    ${a.release.notes.length ? `<ul class="plain">${a.release.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : `<p class="soft">${esc(a.status)}.</p>`}
    <p class="links">${a.links.map((l) => `<a class="go" href="${l.href}">${esc(l.label)}</a>`).join('')}</p>
  </div>
  <p style="margin-top:36px">Made by <a href="../">${esc(site.name)}</a>. <a class="go" href="../#hi">Say hi</a></p>
</div></section>`,
  });
};

// ---------- AMV case study ----------
const amvPage = page({
  title: `${site.amv.company}: what I built there`, description: site.amv.summary, path: '/amv/', scene: 'amv', base: '../', nav: subNav('amv'),
  body: `
<section class="app-top" data-scene-section="amv"><div class="wrap">
  <div class="cols wide-left center">
    <div class="stack">
      <a class="back" href="../">← back to Collin</a>
      <p class="version"><b>${esc(site.amv.company)}</b><br>${esc(site.amv.title)}, ${esc(site.amv.dates)}</p>
      <h1 class="big" style="font-size:clamp(2.4rem,6.4vw,5rem)">From clinic iPads to a camera that coaches your squat.</h1>
      <p class="talk">${esc(site.amv.summary)}</p>
    </div>
    ${cvToy}
  </div>
</div></section>
<section class="chapter" data-scene-section=""><div class="wrap">
${site.amv.products.map((p, i) => `<div${i ? ' style="margin-top:clamp(64px,9vw,120px)"' : ''}>
  <p class="soft">${esc(p.role)}, ${esc(p.dates)}</p>
  <h2 class="big" style="font-size:clamp(2.2rem,6vw,4.6rem);margin-top:6px">${esc(p.name)}</h2>
  <p class="talk" style="margin-top:22px">${esc(p.pitch)}</p>
  <ul class="plain" style="max-width:46em;margin-top:18px">${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <p class="stackline">${p.facts.map(esc).join(' · ')}</p>
  <p class="links" style="margin-top:20px"><a class="solid" href="${p.store}">See it on the App Store</a></p>
</div>`).join('\n')}
  <p class="soft" style="max-width:46em;margin-top:clamp(48px,7vw,88px)">${esc(site.amv.also)} The code for these apps belongs to the company, so this page describes the work instead of showing it. I'm glad to walk through the architecture in an interview.</p>
  <p class="links" style="margin-top:24px"><a class="solid" href="../#hi">Say hi</a><a class="go" href="../#apps">See my own apps</a></p>
</div></section>`,
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
write('404.html', page({ title: 'Not found', description: '', path: '/404.html', base: '/', nav: homeNav.replaceAll('href="#', 'href="/#'), body: `<section class="intro"><div class="wrap"><h1 class="giant">Nothing here.</h1><p class="talk" style="margin-top:24px"><a class="go" href="/">Back to the start</a></p></div></section>` }));
write('.nojekyll', '');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/amv/', ...apps.map((a) => `/${a.id}/`)].map((p) => `<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${apps.length + 3} pages into dist/`);
