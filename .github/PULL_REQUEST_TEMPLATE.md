# Description

Please include a summary of the changes and the related issue. Please also include relevant motivation and context. List any dependencies that are required for this change.

Fixes # (issue)

**Snapshots/Videos:**

## Type of change
<!-- Please delete options that are not relevant. -->

-  🍕 Feature
-  🐛 Bug Fix
-  📝 Documentation Update
-  🎨 Style
-  🧑‍💻 Code Refactor
-  🔥 Performance Improvements
-  ✅ Test
-  🤖 Build
-  🔁 CI
-  📦 Chore (Release)
-  ⏩ Revert
-  ✏️ Updated Test Cases

## Acceptance Test
<!-- Required for all code changes (features, bug fixes, refactors). Not required for docs-only changes. -->

**What does "done" look like? How do you know this works?**

<!-- Describe the acceptance criteria. For example:
- Video playback starts when user presses Play button
- Focus navigation reaches all buttons in the grid
- Vega app builds without errors
-->

**Test code location:** (e.g., `apps/vega/test/VideoPlayer.spec.tsx`)

**Test must be runnable in CI with no manual setup** (test starts servers/fixtures itself). If not applicable (docs change), explain why.

## Proof
<!-- REQUIRED: Commands you ran and their results. Include exact terminal output. -->

**Commands run locally:**
```
$ yarn typecheck
# Paste output here

$ yarn format --check
# Paste output here

$ yarn workspace @multi-tv/vega test
# Paste output here
```

**GitHub CI checks (link to checks page for this PR's latest commit):**
- [ ] ✅ CI checks passed (or explain if not applicable)
- Link: https://github.com/giolaq/react-native-multi-tv-app-sample/pull/XXX/checks

**For TV UI changes, manual testing:**
- [ ] ✅ Tested D-pad navigation (up/down/left/right/select/back)
- [ ] ✅ All interactive elements reachable via remote control
- [ ] ✅ Tested on Vega app: (pass/fail/not applicable)
- [ ] ✅ Tested on Expo app (or other non-Vega platform): (pass/fail/not applicable)

## Blast Radius
<!-- REQUIRED: Classify the risk level of this change. See AGENTS.md for full definitions. -->

- [ ] 🟢 **Green (Low Risk)** – Docs, comments, small refactors, no user-facing impact
- [ ] 🟡 **Yellow (Moderate Risk)** – Features, shared components, video/navigation changes, dependencies
- [ ] 🔴 **Red (Highly Critical)** – App signing, release config, credentials, native modules, store builds

**Justification for classification:**
<!-- Why did you choose this level? What could break if this goes wrong? -->

## Review Level
<!-- REQUIRED: Suggest how thoroughly this should be reviewed. See AGENTS.md for definitions. -->

- [ ] 👤 **Human Review Required** (always required for red blast-radius)
- [ ] 🤖 **AI Review Level 1** (Basic: CI passes, template filled)
- [ ] 🤖 **AI Review Level 2** (Standard: acceptance test + proof + manual QA)
- [ ] 🤖 **AI Review Level 3** (Thorough: two-platform testing + fuzz tests)

## Final Diff Review
<!-- REQUIRED: Before opening this PR, did you review the full diff? -->

- [ ] ✅ I reviewed the complete `git diff main` for this branch
- [ ] ✅ I removed leftover debug logs, commented code, and TODOs I'm not addressing
- [ ] ✅ All platform variants (`.kepler.ts`, `.android.ts`, `.ios.ts`) are updated if applicable

## Added tests?
<!-- Please choose one -->

-  👍 Yes
-  🙅 No, because they aren't needed
-  🙋 No, because I need help

## Internationalization Support?
<!-- Please choose one -->

-  👍 Yes, Added text tokens
-  🙅 No, because they aren't needed
-  🙋 No, because I need help

**Does this PR introduce a breaking change?** (What changes might users need to make in their application due to this PR?)

---

"By submitting this pull request, I confirm that you can use, modify, copy, and redistribute this contribution, under the terms of your choice."