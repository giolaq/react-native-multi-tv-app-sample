# Agent Operating Rules

**For any AI coding agent working in this repository:** Read this file before making changes.

## Core Operating Rule

For anything beyond a short question, follow the handoff loop:

1. **Collect intent** → Read issue/ticket, clarify acceptance criteria, classify blast radius
2. **Write acceptance test first** (TDD) → Test must run in CI with no manual setup
3. **Reproduce in isolation** → Verify the failure on your machine
4. **Implement fix-and-fuzz** → Write fix + tests that try to break it
5. **Capture proof** → Commands run + exact output + GitHub CI status on latest commit
6. **Open PR (never merge)** → Fill template completely
7. **Report back** → Proof + blast radius + review level + deferred items + decisions needed
8. **Respond to review** → If changes requested, repeat from step 3

**When correcting mistakes:** Move fixes up the trust stack—code first, then lint/test, then update this file. Review is last resort, not first defense.

## Repository Commands

```bash
# Install
yarn install --immutable

# Lint
yarn lint:all
yarn workspace @multi-tv/expo-multi-tv lint
yarn workspace @multi-tv/vega lint

# Typecheck
yarn typecheck
yarn workspace @multi-tv/expo-multi-tv typecheck
yarn workspace @multi-tv/vega typecheck

# Test
yarn test:all
yarn workspace @multi-tv/vega test

# Format
yarn format          # Auto-fix
yarn format --check  # Check only

# Build (Expo: requires EXPO_TV=1)
EXPO_TV=1 yarn workspace @multi-tv/expo-multi-tv start
EXPO_TV=1 yarn workspace @multi-tv/expo-multi-tv android

# Build (Vega: uses react-native build-vega)
yarn workspace @multi-tv/vega build:release
```

## TV Platform-Specific Rules

This is a **React Native TV app** for Android TV, tvOS, Fire TV (Fire OS + Vega OS), and Web TV. Key constraints agents miss:

1. **D-pad focus navigation is mandatory**
   - Test every UI change with remote D-pad (↑↓←→ Select Back)
   - Visual correctness ≠ navigable UI
   - If focus order is wrong, the app is unusable

2. **Platform file extensions**
   - `.kepler.ts` = Vega (Fire TV), `.android.ts` = Android TV, `.ios.ts` = tvOS, `.ts` = default
   - Example: `RemoteControlManager.kepler.ts`, `RemoteControlManager.android.ts`, `RemoteControlManager.ios.ts`
   - If editing one variant, check if change applies to others
   - Never import platform-specific code in shared files

3. **Remote control events differ per platform**
   - Vega uses `TVEventHandler` + `HWEvent`
   - tvOS uses native remote APIs
   - Don't copy keyboard handlers from web examples

4. **Video playback uses different APIs**
   - Vega: `@amazon-devices/react-native-w3cmedia` (W3C Media APIs)
   - Others: `react-native-video`
   - Test video changes on Vega AND at least one non-Vega platform

5. **Build commands are platform-specific**
   - Expo apps: always prefix with `EXPO_TV=1`
   - Vega apps: use `react-native build-vega`, not `react-native run-android`
   - Don't unify unless tested on all platforms

## Blast Radius

Classify every PR:

- **🔴 Red (Human review required):** App signing, release configs (`eas.json`), credentials, native modules, store builds, deployment
- **🟡 Yellow (Thorough testing):** Features in shared-ui, navigation, video/remote control, focus management, dependencies
- **🟢 Green (Light review):** Docs, comments, non-breaking single-file refactors

When in doubt, classify as more critical. Justify your choice in the PR.

## Review Levels

- **Human:** Required for all red changes
- **AI Level 1 (Basic):** CI passes, template complete, blast radius reasonable
- **AI Level 2 (Standard):** Level 1 + acceptance test + proof + manual QA
- **AI Level 3 (Thorough):** Level 2 + two-platform testing + fuzz tests + platform variant checks

## Hard Rules

1. **Never merge PRs** (only @giolaq merges)
2. **Never commit secrets** (API keys, signing certs, `.env` files)
3. **Never add dependencies without approval** (ask in PR description first)
4. **Never bypass CI** (no `--no-verify`, no disabling checks)
5. **Acceptance tests run in CI with zero manual setup** (tests start their own servers/fixtures)

## Proof Requirements

Every PR must include:

1. Commands + exact output (`yarn typecheck`, `yarn lint:all`, `yarn test:all`)
2. GitHub CI status on latest commit (link to checks page)
3. For TV UI changes: D-pad navigation tested, Vega + one other platform

Not sufficient: "I tested locally" without commands, or CI from an earlier commit.

## Before Opening PR

- [ ] Review full `git diff` against base branch
- [ ] Remove debug logs, commented code, unaddressed TODOs
- [ ] Update platform variants (`.kepler.ts`, `.android.ts`, `.ios.ts`) if applicable
- [ ] Verify CI passes on pushed commit

## Questions?

Open an issue or ping @giolaq. For detailed explanations, see `docs/trust-stack-assessment.md`.
