// Looks at each app's repository for a release tag newer than the one recorded in
// content/apps/<id>.json. For every new build it:
//   1. updates the version, build, tag and date in the content file (always safe), and
//   2. writes .update/context.md with the changelog and commit list since the last build,
//      for the review step to judge whether the site's copy should change.
// Reads public repositories only. Set GH_TOKEN to raise the API rate limit.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'content/apps');
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-release-watcher', ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) };
const api = async (path, raw = false) => {
  const res = await fetch(`https://api.github.com${path}`, { headers: raw ? { ...headers, Accept: 'application/vnd.github.raw' } : headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return raw ? res.text() : res.json();
};
const parts = (m) => m.slice(1).filter((x) => x !== undefined).flatMap((x) => x.split('.')).map(Number);
const newer = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0); } return false; };

const updates = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, file);
  const app = JSON.parse(readFileSync(path, 'utf8'));
  if (!app.source?.repo || !app.source.tagPattern) continue;
  const pattern = new RegExp(app.source.tagPattern);

  const tags = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api(`/repos/${app.source.repo}/tags?per_page=100&page=${page}`);
    if (!batch?.length) break;
    tags.push(...batch);
    if (batch.length < 100) break;
  }
  const matches = tags.map((t) => ({ name: t.name, sha: t.commit.sha, m: t.name.match(pattern) })).filter((t) => t.m)
    .sort((a, b) => (newer(parts(a.m), parts(b.m)) ? -1 : 1));
  const latest = matches[0];
  if (!latest || latest.name === app.release.tag) { console.log(`${app.name}: no new build (${app.release.tag || 'no tags yet'})`); continue; }

  const previous = app.release.tag;
  const commit = await api(`/repos/${app.source.repo}/commits/${latest.sha}`);
  const date = (commit?.commit?.committer?.date || new Date().toISOString()).slice(0, 10);
  const [version, build = ''] = [latest.m[1], latest.m[2]];

  let context = `# ${app.name}: ${previous || '(first tracked build)'} → ${latest.name}\n\nContent file: content/apps/${file}\nRepository: https://github.com/${app.source.repo}\n\n`;
  if (app.source.changelog) {
    const log = await api(`/repos/${app.source.repo}/contents/${app.source.changelog}?ref=${latest.sha}`, true);
    if (log) {
      // Keep the sections from the top of the changelog down to the previously recorded build.
      const stop = previous ? log.indexOf(`[${previous.replace(/^.*\//, '')}]`) : -1;
      context += `## Changelog since the last recorded build\n\n${(stop > 0 ? log.slice(0, stop) : log).slice(0, 12000)}\n\n`;
    }
  }
  if (previous) {
    const cmp = await api(`/repos/${app.source.repo}/compare/${encodeURIComponent(previous)}...${encodeURIComponent(latest.name)}`);
    if (cmp) {
      context += `## Commits (${cmp.total_commits})\n\n${cmp.commits.slice(-80).map((c) => `- ${c.commit.message.split('\n')[0]}`).join('\n')}\n\n`;
      context += `## Files changed (${cmp.files?.length ?? 0})\n\n${(cmp.files ?? []).slice(0, 120).map((f) => `- ${f.status} ${f.filename} (+${f.additions} −${f.deletions})`).join('\n')}\n`;
    }
  }

  app.release = { ...app.release, tag: latest.name, version, build, date };
  writeFileSync(path, JSON.stringify(app, null, 2) + '\n');
  updates.push({ id: app.id, name: app.name, from: previous, to: latest.name, context });
  console.log(`${app.name}: ${previous || 'none'} → ${latest.name}`);
}

if (updates.length) {
  mkdirSync(join(root, '.update'), { recursive: true });
  writeFileSync(join(root, '.update/context.md'), updates.map((u) => u.context).join('\n---\n\n'));
  writeFileSync(join(root, '.update/pending.json'), JSON.stringify(updates.map(({ context, ...u }) => u), null, 2));
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${updates.length > 0}\nsummary=${updates.map((u) => `${u.name} ${u.to}`).join(', ')}\nslug=${updates.map((u) => `${u.id}-${u.to}`).join('-').replace(/[^a-zA-Z0-9.-]+/g, '-')}\n`);
}
