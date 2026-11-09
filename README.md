# collinbrowse.github.io

My portfolio: [collinbrowse.github.io](https://collinbrowse.github.io).

```bash
node build.mjs                                # content/ + site/ -> dist/
python3 -m http.server 4173 --directory dist  # preview at localhost:4173
```

## How it stays current

`.github/workflows/watch-releases.yml` runs every six hours (and on demand).

1. `scripts/check-releases.mjs` compares each app's newest release tag with the one recorded in `content/apps/<id>.json`.
2. For a new build it bumps the version, build and date, and collects the changelog, commit subjects and changed files since the last build.
3. Claude reads that and follows `.github/release-review-prompt.md` to decide whether a visitor would care.
   - **Routine** (fixes, refactors, tooling): the version bump is committed straight to `main` and the site redeploys.
   - **Meaningful** (new feature, new availability, a claim on the site is now wrong): the proposed copy is pushed to a `release/...` branch and a pull request is opened for me to review.
4. Without an API key the review step is skipped and every new build opens a pull request with the raw change list.

Tags watched: `testflight/x.y.z+build` on Silver-Screen, `vX.Y.Z` on CrewCue and CashFlow.

### One-time setup

- Settings → Pages → Source: **GitHub Actions**.
- Settings → Actions → General → allow GitHub Actions to create pull requests.
- Add a repository secret: `ANTHROPIC_API_KEY`, or `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`.

### Media

Videos are not pulled automatically. Silver Screen clips come from its `scripts/marketing.py` output
(`marketing/output/video/iphone/dark/*.mp4`); copy new ones into `site/media/silver-screen/`.
The watcher's pull request says when a release looks like it deserves a new clip.
