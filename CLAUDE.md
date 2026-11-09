# Portfolio site

Static site for collinbrowse.github.io. No dependencies and no framework.

- `content/site.json` — profile, AMV case study, process, skills.
- `content/apps/<id>.json` — one file per app: copy, features, engineering notes, links, and `release` (tag, version, build, date, notes).
- `site/` — stylesheet, script and media, copied as-is. Media lives in `site/media/<app-id>/`.
- `build.mjs` — renders `content/` into `dist/`. Run `node build.mjs`; preview with `python3 -m http.server --directory dist`.
- `scripts/check-releases.mjs` + `.github/workflows/watch-releases.yml` — the release watcher (see README).

## Rules for edits

- Change copy in `content/`, not in `build.mjs`. Templates only change when the layout does.
- Every claim must be true and checkable against the app's repository or Collin's resume. No invented numbers, links or media.
- AMV code is proprietary. Describe that work; never add its code, internal names or screenshots.
- Writing: plain, specific, first person, short sentences. No hype words, no emoji, no exclamation marks.
- A clip tab only appears if `site/media/<app-id>/<clip-id>.mp4` and `.jpg` both exist.
- Cash Flow media must come from demo data, never a linked bank account.
- Run `node build.mjs` before finishing; it must succeed.
