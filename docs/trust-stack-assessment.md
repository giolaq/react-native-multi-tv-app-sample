# Trust Stack Assessment

**Repository:** giolaq/react-native-multi-tv-app-sample  
**Owner:** Giovanni Laquidara (@giolaq)  
**Assessment Date:** November 18, 2026  
**Assessed By:** Cursor Cloud Agent

## Executive Summary

This React Native multi-TV app sample targets Android TV, Apple TV, Fire TV (Fire OS), Fire TV (Vega OS), and Web TV platforms using a Yarn workspaces monorepo. The repository has a solid foundation with TypeScript, ESLint, Prettier, Husky git hooks, and commitlint, but the trust stack needs strengthening before scaling agent-driven development. Key gaps: broken lint/typecheck on main, no CI automation, no agent operating rules, and missing blast-radius classification for changes.

**Trust Stack Status:**

- **Codebase (Architecture & Types):** 🟡 Yellow – Strong monorepo structure and TypeScript, but TV-specific patterns create agent traps
- **Static Analysis (Lint/Test/CI):** 🔴 Red – Lint and typecheck broken on main; no CI workflows
- **Prose (Rules & Documentation):** 🔴 Red – No AGENTS.md, no agent operating procedures
- **Human Review:** 🔴 Red – No branch protection, no CODEOWNERS, no blast-radius framework

## Layer 1: Codebase (Architecture, Types, Boundaries)

### What's Strong

1. **Monorepo with Yarn Workspaces**
   - Package manager: `yarn@4.5.0`
   - Workspaces: `apps/expo-multi-tv`, `apps/vega`, `packages/shared-ui`
   - Clear separation between Expo/RN-tvOS universal app and Vega-specific Fire TV app
   - Shared UI library with reusable TV components

2. **TypeScript with Strict Mode**
   - `tsconfig.base.json` with `"strict": true`
   - Type-safe component architecture
   - Each workspace has its own `typecheck` script

3. **Platform-Specific File Resolution**
   - React Native's platform extensions work correctly: `.kepler.ts`, `.android.ts`, `.ios.ts`
   - Example: `RemoteControlManager.kepler.ts` for Fire TV/Vega, separate Android/iOS variants
   - Automatic resolution means agents won't accidentally break cross-platform builds

4. **Focus Management & Spatial Navigation**
   - Uses `react-tv-space-navigation` (v6.0.0-beta1) for D-pad/remote control navigation
   - Custom remote control abstraction in `packages/shared-ui/src/app/remote-control/`
   - TV-optimized components in shared-ui

### What's Missing / Risky

1. **TV-Specific "Shortest Path" Traps** (agents will copy these patterns)

   **Trap 1: Focus Management Patterns**
   - TV apps require explicit focus management for D-pad/remote navigation
   - Agents copying web/mobile patterns will create non-navigable UIs
   - Example: A button without proper `focusable` props or spatial navigation context becomes unreachable via remote
   - **What to watch:** Changes to components must include focus/spatial-nav testing; visual QA alone won't catch navigation failures

   **Trap 2: Platform File Extensions**
   - Files like `VideoHandler.kepler.ts` use Vega/Fire TV-specific APIs (`@amazon-devices/react-native-w3cmedia`)
   - Agents might edit the `.ts` base file instead of the `.kepler.ts` override, breaking Fire TV builds
   - Or create a new file without the platform variant, causing runtime failures on TV
   - **What to watch:** Changes to files with platform variants (`.kepler`, `.android`, `.ios`) must update all variants or explicitly document why one platform differs

   **Trap 3: Remote Control Event Handling**
   - TV platforms have different key event systems (HWEvent on Vega, native events on tvOS)
   - Agents copying keyboard handlers from web examples will miss D-pad back/menu button handling
   - `TVEventHandler` is Vega-specific; agents might try to use it on other platforms
   - **What to watch:** Any input/navigation change must include manual remote control testing on at least one TV platform

   **Trap 4: Video Playback & Media Controls**
   - Fire TV Vega uses W3C Media APIs (`@amazon-devices/react-native-w3cmedia`)
   - Other platforms use `react-native-video`
   - Agents might unify these in a way that breaks platform-specific optimizations
   - **What to watch:** Video player changes require testing on both Vega and non-Vega platforms

   **Trap 5: Build Configuration Complexity**
   - `expo-multi-tv` requires `EXPO_TV=1` env var for all commands
   - Vega builds use `react-native build-vega` (not standard RN CLI)
   - EAS build config in `eas.json` for app store submissions
   - **What to watch:** Build/release script changes must preserve platform-specific commands and environment variables

2. **Type Safety Gaps**
   - Kepler/Vega platform files have TypeScript errors (see Layer 2 issues)
   - Some `console` globals not recognized due to missing lib types
   - Type definitions for Vega-specific packages incomplete

3. **No Explicit Module Boundaries**
   - Shared-ui can import from any dependency
   - No enforcement preventing platform-specific code leaking into shared components
   - Recommendation: Add eslint-plugin-boundaries or document import rules in AGENTS.md

### What Changed in This PR

- **Added:** Documentation of TV-specific patterns and agent traps in this assessment
- **Added:** Operating rules in AGENTS.md requiring acceptance tests for D-pad navigation and remote control handling
- **Not Changed:** Codebase architecture itself (no refactors per instructions)

## Layer 2: Static Analysis (Lint, Tests, CI)

### What's Strong

1. **Tooling Installed**
   - ESLint 9.x with TypeScript parser, React plugin, Prettier integration
   - Husky git hooks: pre-commit (lint-staged), commit-msg (commitlint)
   - Commitlint with conventional commits
   - Jest in expo-multi-tv and vega apps
   - Testing Library for React Native in vega app

2. **Workspace Scripts**
   - Root package.json has `lint:all`, `typecheck`, `test:all`, `format`
   - Individual workspaces have their own lint/test/typecheck scripts

### What's Missing / Broken

**CRITICAL: Lint, Typecheck, and Test Scripts Fail on Main Branch**

Running the documented scripts on a fresh clone of `main` produces errors:

1. **`yarn lint:all` fails**

   ```
   - shared-ui: "command not found: eslint" (eslint not in devDependencies)
   - expo-multi-tv: "Cannot find module 'eslint-plugin-prettier'" (root eslint.config.js requires it, not in root devDeps)
   - vega: "Invalid option '--ext'" (using deprecated ESLint 8 CLI flags with ESLint 9 config)
   ```

2. **`yarn typecheck` fails**

   ```
   - vega app: 40+ TypeScript errors in *.kepler.ts files
     - "Cannot find name 'console'" (missing 'dom' lib in tsconfig)
     - "Cannot find name 'global'" (Node types missing)
     - "Cannot find module 'react-native'" and Kepler packages (type resolution issues)
   - shared-ui: similar console/global errors in kepler files
   ```

3. **`yarn test:all` fails**
   ```
   - shared-ui: "command not found: jest" (no jest in devDependencies)
   ```

**Why This Matters:** Agents running these scripts will see failures unrelated to their changes, making it impossible to verify their work. A new contributor cannot validate their PR before submitting.

### What Changed in This PR

**Approach:** Per playbook instructions ("If existing lint/type/test runs fail on main, don't do a big cleanup: report it, and either fix only trivially or scope CI so it's honest about what it enforces"), this PR:

1. **Does NOT fix all linting/typecheck errors** (would require broad refactoring)
2. **Does NOT add missing dependencies** (per "Do NOT add new dependencies" instruction)
3. **Creates CI that reflects current reality:**
   - CI runs `yarn format --check` (works and enforces Prettier)
   - CI does NOT run `yarn lint:all` or `yarn typecheck` (broken on main)
   - CI does NOT run `yarn test:all` (broken on main)

4. **Documents broken checks in this assessment**
5. **Recommends fixes as deferred follow-ups** (see Deferred Items in PR description)

**Alternative Considered:** Fix trivially by:

- Adding eslint to shared-ui devDeps
- Adding eslint-plugin-prettier to root devDeps
- Updating vega lint script to remove `--ext` flag
- Adding jest to shared-ui devDeps
- Fixing TypeScript lib configs for console/global

**Decision:** User instruction was "Do NOT add new dependencies; list any you'd recommend as proposals in the PR body." Treating all the above as proposals instead of implementing.

## Layer 3: Prose (AGENTS.md, Rules, Templates)

### What's Strong

1. **Existing PR Template**
   - `.github/PULL_REQUEST_TEMPLATE.md` exists
   - Includes type of change, test status, internationalization checklist
   - Has placeholder for test snapshots

2. **Good README**
   - Clear architecture documentation
   - Platform-specific build instructions
   - Troubleshooting section

### What's Missing

1. **No AGENTS.md or Agent Operating Rules**
   - No documented process for how coding agents should work
   - No acceptance test requirements
   - No handoff protocol
   - No blast-radius classification

2. **No CLAUDE.md or Cursor Rules**
   - No LLM-specific guidance files
   - No .cursor/rules pointing to agent operating procedures

3. **PR Template Missing Trust-Stack Elements**
   - No acceptance test requirement (steps to reproduce + verify)
   - No proof requirement (commands + results + CI links)
   - No blast-radius classification
   - No review-level designation
   - No final-diff-review checkbox

### What Changed in This PR

- **Added:** `AGENTS.md` with full operating rules, handoff loop, blast-radius framework, lock-the-doors constraints, and lessons learned
- **Added:** `CLAUDE.md` pointing to AGENTS.md
- **Added:** `.cursor/rules/agent-operating-rules.mdc` pointing to AGENTS.md for Cursor-based agents
- **Updated:** `.github/PULL_REQUEST_TEMPLATE.md` with acceptance test, proof, blast radius, review level, and final-diff-review requirements

## Layer 4: Human Review

### What's Strong

1. **Single Maintainer Model**
   - Giovanni (@giolaq) is the sole maintainer
   - Clear ownership and accountability

### What's Missing

1. **No Branch Protection Rules**
   - Default branch (`main`) has no protection
   - Anyone with write access can push directly to main
   - No PR requirement, no status checks, no review requirement

2. **No CODEOWNERS**
   - No automatic reviewer assignment
   - No explicit ownership documentation

3. **No Blast-Radius Framework**
   - All changes treated equally
   - No distinction between config changes (high risk) and docs (low risk)

### What Changed in This PR

- **Added:** Branch protection recommendations documented in this assessment (see Recommendations section)
- **Not Changed:** Actual GitHub repository settings (per "Don't change any repo settings" instruction)

## TV-Platform Specific Considerations

**Why This Matters for Agent Orchestration:**

TV development has unique constraints that agents trained on web/mobile patterns won't anticipate:

1. **Input Model:** Remote control D-pad (up/down/left/right/select/back) instead of touch or mouse
   - Agents must test navigation paths, not just visual appearance
   - A UI that looks correct can be completely unusable if focus order is wrong

2. **Screen Distance:** 10-foot UI vs 2-foot (mobile) or 1-foot (desktop)
   - Text must be larger, touch targets are irrelevant, clickable areas need to be TV-safe zones
   - Agents copying responsive web patterns will create illegible UIs

3. **Platform Fragmentation:** Five different runtimes (Android TV, tvOS, Fire TV Fire OS, Fire TV Vega OS, Web TV)
   - Each has different media APIs, input handling, and performance characteristics
   - Changes must be tested on at least two platforms (Vega + one other)

4. **Approval Processes:** TV app stores (Amazon Appstore, Apple App Store, Google Play) have strict review
   - Breaking changes that ship to production can take weeks to fix through store review
   - Red blast-radius changes (store builds, signing configs) require human review always

## Recommendations for Next Steps

### Immediate (Do Before Scaling Agents)

1. **Fix Static Analysis on Main**
   - Add eslint, jest to shared-ui devDependencies
   - Add eslint-plugin-prettier to root devDependencies
   - Update vega lint script to ESLint 9 CLI syntax
   - Fix TypeScript configs for Vega platform files (add lib: ["dom", "es2019"] where needed)
   - Verify `yarn lint:all`, `yarn typecheck`, `yarn test:all` pass on clean clone

2. **Enable Branch Protection**
   - Create branch ruleset on `main`:
     - Require pull request (0 approvals since Giovanni is solo, but PR is mandatory)
     - Require status checks: `ci-format-check` (the job name in the new workflow)
     - Block force pushes
     - Block branch deletion
   - See detailed settings below

3. **Populate Test Suite**
   - Vega app has 2 tests, expo-multi-tv has none
   - Add critical path tests: navigation flow, video playback, focus management
   - Tests must run in CI with no manual setup (tests start servers/fixtures themselves)

### Short Term (Before First Agent-Driven Feature)

1. **TV-Specific Acceptance Test Examples**
   - Document in AGENTS.md: "Focus navigation test: can you reach every button using only D-pad?"
   - Example remote control event test using Testing Library
   - Platform variant test: verify .kepler.ts and .ts both build

2. **Module Boundary Rules**
   - Document or enforce: shared-ui cannot import platform-specific packages
   - Kepler imports must stay in `.kepler.ts` files only

3. **E2E Testing Guidance** (optional, recommended)
   - Consider Detox for React Native TV UI testing
   - Or document manual QA requirements for TV focus/navigation
   - These are proposals, not blockers (per "list any you'd recommend")

### Long Term (Trust Stack Maturity)

1. **Automated TV Focus Testing**
   - Tooling to verify spatial navigation can reach all interactive elements
   - Focus order validation in CI

2. **Platform Variant Linting**
   - Detect when a file has `.kepler.ts` variant but change only touches base `.ts` file
   - Warn when platform-specific imports appear in non-platform files

3. **Blast Radius in CI**
   - Automatic detection: changes to `eas.json`, app signing, native configs → red
   - Changes to `packages/shared-ui/src/components` → yellow
   - Changes to docs → green

## Branch Protection Settings (To Be Applied by Repository Owner)

**Recommended GitHub Ruleset for `main` branch:**

```yaml
Name: Protect main branch
Enforcement: Active
Bypass list: None (Giovanni reviews all PRs even though he's the author, for the git history)

Rules:
  Require pull request before merging:
    Required approvals: 0
    # 0 approvals is intentional: Giovanni is the sole maintainer
    # PR requirement creates the audit trail and runs CI
    # Giovanni can approve his own PRs after CI passes

  Require status checks to pass:
    Require branches to be up to date: true
    Status checks that are required:
      - ci-format-check (exact job name from .github/workflows/ci.yml)
    # Add ci-lint-check, ci-typecheck, ci-test once those scripts work

  Block force pushes: true
  Block deletions: true
```

**How to apply:**

1. Go to https://github.com/giolaq/react-native-multi-tv-app-sample/settings/rules
2. Create new ruleset
3. Target: default branch (`main`)
4. Configure rules as above

**After fixing lint/typecheck/test scripts:**

- Add more required status checks: `ci-lint-check`, `ci-typecheck`, `ci-test`
- Update ruleset without changing PR approval count

## Lessons Learned from Previous Repository

(Included per playbook requirement; these are already incorporated in AGENTS.md)

1. **Acceptance tests must run in CI with no manual setup**
   - Tests start any servers/fixtures themselves
   - No "run these commands first" instructions allowed

2. **Proof must include actual GitHub check results**
   - Must show CI status on the PR's latest commit
   - Local test runs are good but not sufficient

3. **Review final diff for leftover scratch/debug changes**
   - Before reporting completion, review the full PR diff
   - Remove any console.logs, commented code, or TODOs added during development

## Summary: What This PR Delivers

### New Files

- `docs/trust-stack-assessment.md` (this document)
- `AGENTS.md` (operating rules, handoff loop, blast radius, lock-the-doors)
- `CLAUDE.md` (pointer to AGENTS.md)
- `.cursor/rules/agent-operating-rules.mdc` (Cursor rule pointing to AGENTS.md)
- `.github/workflows/ci.yml` (format check only, scoped to what works)

### Updated Files

- `.github/PULL_REQUEST_TEMPLATE.md` (added acceptance test, proof, blast radius, review level, final-diff-review)

### Not Changed

- Codebase itself (no refactors, no reformatting of existing source)
- Broken lint/typecheck scripts (deferred per instructions)
- Repository settings (branch protection documented, not applied)

### Deferred to Follow-Up PRs

1. Fix static analysis (add missing dependencies, fix TypeScript configs, update lint scripts)
2. Add CI jobs for lint, typecheck, test once those scripts work
3. Populate test suite (especially TV focus/navigation tests)
4. Add module boundary rules/linting
5. Consider TV-specific E2E testing tools (Detox or similar)

---

**Assessment Completed:** This assessment provides the foundation for agent-orchestrated development. The prose layer (AGENTS.md) and CI foundation are in place. The static analysis layer needs repair before agents can verify their work reliably. The codebase layer is solid but requires TV-specific awareness that agents won't have by default—which is why acceptance tests and blast-radius classification are mandatory.
