# Agent Operating Rules

**Repository:** giolaq/react-native-multi-tv-app-sample  
**Last Updated:** November 18, 2026

This document defines how coding agents (Claude Code, Codex, Cursor, or any AI-powered developer tool) should work in this repository. If you are an AI agent working on this codebase, **read this file in full before making any changes.**

## Table of Contents

1. [Core Operating Rule](#core-operating-rule)
2. [The Handoff Loop](#the-handoff-loop)
3. [Blast Radius Classification](#blast-radius-classification)
4. [Review Levels](#review-levels)
5. [Lock-The-Doors: Security & Credentials](#lock-the-doors-security--credentials)
6. [TV Platform-Specific Rules](#tv-platform-specific-rules)
7. [Lessons Learned](#lessons-learned)

---

## Core Operating Rule

**For anything more than a short question, do not write the code yourself. Follow the handoff loop below.**

This means:

- **Planning:** Understand the requirement, write acceptance criteria
- **Implementation:** Write the fix/feature with tests
- **Verification:** Run acceptance tests on your own machine, capture proof
- **Submission:** Open a pull request (never merge), report back with proof

**Every time you have to correct your own code or another agent's code, move that fix up the trust stack:**

1. Fix the code
2. Add a lint rule or test to prevent it recurring
3. Update this rules file if needed
4. Human review is the last resort, not the first line of defense

Start with this one loop. Do not build 50 agents. Prove one agent can be trusted first.

---

## The Handoff Loop

Use this loop for every task. It is based on Lauren Tan's agent orchestration workflow (video: "Grok Bot + Claude Code, Why is Everyone Switching to This?" by Rob Shocks, Nov 2026).

### Step 1: Collect Intent

- Read the issue, ticket, or direct request
- Clarify acceptance criteria: what does "done" look like?
- Identify blast radius (see below): green, yellow, or red?

### Step 2: Write an Acceptance Test First (TDD)

- Before writing implementation code, write a test that specifies the behavior
- Test must be runnable in CI with no manual setup (test starts servers/fixtures itself)
- For TV-specific changes, include:
  - Focus navigation test (can you reach the element via D-pad?)
  - Remote control event test (does back/menu/play-pause work?)
  - Platform variant test (do both `.kepler.ts` and `.ts` builds succeed?)

### Step 3: Reproduce in Isolation

- Set up the failure case on your own computer
- Do not assume the reported environment matches yours
- If you cannot reproduce, ask for more details before implementing

### Step 4: Implement Fix-and-Fuzz

- Write the fix
- Write tests that try to break it (fuzz):
  - Edge cases: empty strings, null, very long lists
  - User errors: pressing back rapidly, navigating away mid-load
  - Platform variations: does it work on Vega and non-Vega?
- Run existing tests: `yarn typecheck`, `yarn format --check`, `yarn test:all` (once fixed)
- Run your new acceptance test

### Step 5: Capture Proof

- **Required:** Commands you ran and their results (copy exact terminal output)
- **Required:** GitHub CI check status on your PR's latest commit
- **Not sufficient:** "I tested locally and it works" without commands
- **Not sufficient:** CI results from an earlier commit

Example proof format:

```
Commands run locally:
$ yarn workspace @multi-tv/expo-multi-tv test
PASS src/components/Button.test.tsx
✓ renders correctly
✓ responds to D-pad Enter key

$ yarn format --check
All matched files use Prettier code style!

GitHub CI checks (https://github.com/giolaq/react-native-multi-tv-app-sample/pull/123):
✅ ci-format-check
```

### Step 6: Open Pull Request (Never Merge)

- Use the PR template (requires acceptance test, proof, blast radius, review level, final-diff-review)
- Include blast radius classification (green/yellow/red)
- Suggest a review level (human, AI-1, AI-2, AI-3)
- **Do not merge.** Only the repository owner (@giolaq) merges PRs

### Step 7: Report Back

- Ping the repository owner with:
  - What was done
  - Proof (commands + CI status)
  - Blast radius and review level
  - Anything deferred or blocked
  - Any decisions you need from them

### Step 8: Respond to Review

- If review requests changes, go back to Step 3
- Move any repeated mistake up the stack:
  - Add a lint rule, test, or entry in this file
  - Do not rely on review alone to catch the same issue next time

---

## Blast Radius Classification

Every change has a blast radius: how much could break if this goes wrong. Classify your PR as green, yellow, or red.

### 🔴 Red (Highly Critical)

**Definition:** Changes that, if wrong, could cause security breaches, data loss, store rejection, or production-breaking failures.

**Examples:**

- App signing keys, certificates, or provisioning profiles
- Release build configurations (`eas.json`, app version, bundle IDs)
- Store submission assets (screenshots, app description for Amazon/Apple/Google stores)
- Authentication, credentials, or API keys
- Payment processing or user data handling
- Native module configuration (Kepler/Vega SDK versions, React Native core version)
- CI/CD deployment pipelines
- Branch protection rules or repository settings

**Review Requirement:** **Human review always required.** Do not auto-merge. Giovanni must review and approve.

**Testing Requirement:**

- Full manual QA on at least two TV platforms (Vega + one other)
- Staging environment deployment and soak test before production
- Security review if touching auth/credentials

### 🟡 Yellow (Moderate Risk)

**Definition:** Changes that could break functionality for users or introduce bugs, but are recoverable.

**Examples:**

- New features in shared-ui components (used by multiple apps)
- Changes to navigation or routing logic
- Video playback or media control changes
- Remote control event handling
- Focus management or spatial navigation updates
- API client changes (fetching movie catalog, etc.)
- Dependency updates (especially major versions)

**Review Requirement:** Stronger automated verification. AI review level 2 or 3, or human review.

**Testing Requirement:**

- Acceptance test included in PR
- Tests run in CI (no manual setup)
- Manual QA on at least one TV platform
- Focus navigation verified (D-pad can reach all interactive elements)

### 🟢 Green (Low Risk)

**Definition:** Small, isolated changes with minimal user impact.

**Examples:**

- Documentation updates (README, comments, this file)
- Code comments or type annotations
- Non-breaking refactors within a single file
- Fix typos in logs or error messages (not user-facing text)
- Dev tooling improvements (prettier config, editor settings)

**Review Requirement:** Automated proof may be sufficient. AI review level 1, or Giovanni can merge after quick scan.

**Testing Requirement:**

- CI must pass (format check, lint if available)
- No new functionality means acceptance test may not be needed (but always encouraged)

### How to Choose

When in doubt, treat the change as more critical, not less.

Ask: "If this breaks in production, what's the worst that happens?"

- **Red:** Store rejection, security breach, data loss, app crashes on launch, or users locked out → Red
- **Yellow:** Feature doesn't work, users see errors, some flows broken but app still usable → Yellow
- **Green:** No user-visible impact, only affects developers or docs → Green

---

## Review Levels

Blast radius determines the minimum review level. The agent proposes, the human decides.

### Human Review

- **Required for:** All red blast-radius changes
- **Optional for:** Yellow if you want extra confidence
- **Process:** Giovanni (@giolaq) reviews the PR, tests on device if needed, approves or requests changes

### AI Review Levels

**AI Level 1 (Basic):**

- CI checks pass (format, lint, typecheck, test)
- PR template filled out correctly
- Blast radius classification present and reasonable
- Useful for green blast-radius changes

**AI Level 2 (Standard):**

- Level 1, plus:
- Acceptance test included and passes
- Proof (commands + results + CI links) provided
- Focus navigation tested manually (for UI changes)
- Useful for yellow blast-radius changes with low complexity

**AI Level 3 (Thorough):**

- Level 2, plus:
- Manual QA on two TV platforms (Vega + one other)
- Fuzz testing included (edge cases, rapid user actions, error injection)
- Platform variant testing (.kepler.ts and .ts both build and work)
- Useful for yellow blast-radius changes with high complexity or cross-platform concerns

**Note:** AI review is not a substitute for human review on red changes. It's a way to scale verification for green/yellow changes.

---

## Lock-The-Doors: Security & Credentials

The more autonomy an agent has, the less you can rely on it to police itself. Controls live in the environment, not in a prompt.

### Rules for This Repository

1. **Agents Run in Sandboxes**
   - Cursor Cloud Agents run in isolated VMs
   - Local coding agents (Claude Code, Codex) run on the developer's machine with scoped access
   - No agent has direct access to production infrastructure

2. **Scoped Credentials**
   - API keys and secrets live in Cursor Dashboard (Cloud Agents > Secrets) or local env files (`.env`, never committed)
   - Agents have read-only access where possible
   - Never put app signing keys, store credentials, or long-lived secrets in the repository

3. **Agents Open PRs, Never Merge**
   - Agents can create branches and open pull requests
   - Only @giolaq merges PRs (enforced by branch protection once applied)
   - This creates an audit trail and human checkpoint

4. **No Secrets on Shared Machines**
   - Do not place API keys, CLI logins, or browser sessions on a computer or environment that every agent can see
   - Shared files, command-line credentials, and environment variables on a shared agent machine are visible to every agent that uses that machine

5. **Enforce in CI and Branch Protection**
   - Use GitHub branch protection to require PRs and status checks
   - Use GitHub Secrets for any credentials needed in CI
   - Use CODEOWNERS for high-risk paths (if added later: `eas.json`, `app.json`, signing configs)

### What Agents Must Not Do

- **Never commit secrets** (API keys, signing certificates, `.env` files, auth tokens)
- **Never merge pull requests** (even their own)
- **Never bypass CI** (push with `--no-verify` or disable status checks)
- **Never access production systems directly** (if this repo had a prod deploy, which it doesn't yet)

### What to Do If a Secret Is Committed

1. **Revoke the secret immediately** (regenerate API key, rotate certificate)
2. **Remove from git history** (BFG Repo-Cleaner or `git filter-branch`)
3. **Update AGENTS.md** with how to prevent it (add to .gitignore, update CI secret scanning)

---

## TV Platform-Specific Rules

This repository targets **Android TV, Apple TV, Fire TV (Fire OS), Fire TV (Vega OS), and Web TV**. TV development has unique constraints that agents trained on web/mobile patterns won't anticipate.

### Rule 1: Test Remote Control Navigation, Not Just Visual Appearance

- A UI that looks correct in a screenshot can be completely unusable if focus order is wrong
- **Before submitting any UI change:**
  - Test with D-pad (up/down/left/right/select/back)
  - Verify every interactive element is reachable via remote control
  - Test back button (should exit video player, close drawer, go back one screen)
  - Test play/pause, rewind, fast-forward if touching video playback

### Rule 2: Platform File Extensions Must Match Platform Scope

- React Native resolves platform-specific files: `.kepler.ts` (Vega), `.android.ts` (Android TV), `.ios.ts` (tvOS), `.ts` (default)
- **If a file has a `.kepler.ts` variant:**
  - Changes to shared logic go in the base `.ts` file
  - Changes specific to Vega go in `.kepler.ts`
  - Both files must build and pass typecheck
- **If you edit `RemoteControlManager.kepler.ts`:**
  - Ask: does this change also apply to `.android.ts` and `.ios.ts` variants?
  - If yes, apply to all three
  - If no, document in a comment why Vega differs

### Rule 3: Video Playback Changes Must Work on Vega and Non-Vega

- Vega uses `@amazon-devices/react-native-w3cmedia` (W3C Media APIs)
- Other platforms use `react-native-video`
- **Before submitting video player changes:**
  - Test on Vega app (`apps/vega`)
  - Test on Expo app (`apps/expo-multi-tv`) on at least one non-Vega platform (Android TV, tvOS, or Web)

### Rule 4: Build Commands Are Platform-Specific

- **Expo Multi-TV:** Always use `EXPO_TV=1` env var (e.g., `EXPO_TV=1 yarn workspace @multi-tv/expo-multi-tv start`)
- **Vega:** Use `react-native build-vega` (not standard `react-native run-android`)
- **Do not unify these** unless you have tested on all platforms
- See `package.json` scripts for correct commands

### Rule 5: Focus Management is Non-Negotiable

- All interactive elements must participate in spatial navigation
- Use `react-tv-space-navigation` hooks and components
- Test focus order matches visual layout (left-to-right, top-to-bottom for LTR locales)
- High contrast mode and large text settings must not break focus indicators

### Rule 6: TV-Specific Blast Radius

- Changes to `eas.json` (app store builds) are **always red**
- Changes to `react-native.config.js` (native config) are **always red**
- Changes to video playback or remote control handling are **yellow** (require two-platform testing)
- Changes to shared-ui components are **yellow** (impact both apps)

---

## Lessons Learned

These lessons come from previous agent-driven work in other repositories. They are already failures we've seen. Learn from them.

### Lesson 1: Acceptance Tests Must Run in CI with No Manual Setup

**The Mistake:** Agent writes a test that says "First, run `yarn dev` in one terminal. Then, run this test in another terminal."

**Why It's a Problem:** CI can't run that. The test is useless for automation.

**The Fix:** Tests start their own servers/fixtures. Use in-memory backends, mock data, or test-specific ports.

**Example (Good):**

```typescript
describe('Video Player', () => {
  let server: http.Server;

  beforeAll(() => {
    server = startMockVideoServer(9999);
  });

  afterAll(() => {
    server.close();
  });

  it('loads video from mock server', async () => {
    // Test code here
  });
});
```

### Lesson 2: Proof Must Include Actual GitHub Check Results

**The Mistake:** Agent says "I tested locally and it works" without showing CI status.

**Why It's a Problem:** Local environment might have tools/deps CI doesn't have. Or agent ran tests before the final commit.

**The Fix:** Include GitHub CI status from the PR's latest commit. Link to the checks page.

**Example (Good):**

```
Proof:
- Local: yarn test passed (output below)
- CI: https://github.com/giolaq/react-native-multi-tv-app-sample/pull/123/checks
  ✅ ci-format-check passed
```

### Lesson 3: Review the Final Diff for Leftover Scratch Changes

**The Mistake:** Agent finishes the feature, opens a PR, but the diff includes:

- `console.log('DEBUG: inside handlePlayPause')` (forgot to remove)
- Commented-out old code `// const oldHandler = ...`
- `TODO: refactor this later`

**Why It's a Problem:** These are noise. They make review harder and pollute the codebase.

**The Fix:** Before opening the PR, run `git diff main` and review the full diff yourself. Remove any:

- Debug logs you added during development
- Commented code (if it's not needed, delete it; if it is, uncomment it)
- TODO comments you're not addressing in this PR

**Exception:** If the TODO is genuinely documenting a known issue for a future PR, keep it. But if it's a note to yourself, remove it.

### Lesson 4: If Lint or Typecheck Fail on Main, Say So

**The Mistake:** Agent runs `yarn typecheck`, sees 40 errors, and panics. Tries to fix them all, breaking unrelated code.

**Why It's a Problem:** Those errors might be pre-existing. Fixing them is not your job (unless that's your task).

**The Fix:** Check if your change introduced the errors. Compare:

```bash
# On main branch
$ git checkout main
$ yarn typecheck
# Note the errors

# On your branch
$ git checkout cursor/my-feature-941e
$ yarn typecheck
# Are there NEW errors? Fix those.
# If the same errors exist on main, mention them in your PR but don't fix them unless asked.
```

### Lesson 5: Never Claim CI Passed Unless You Saw It Pass

**The Mistake:** Agent opens a PR, sees CI is queued, says "CI passed."

**Why It's a Problem:** CI might fail. You're giving false confidence.

**The Fix:** Wait for CI to finish. If it fails, fix the failure or report it. Only claim "CI passed" after seeing the green check on GitHub.

### Lesson 6: One Logical Change Per Commit (But Don't Batch Unless Asked)

**The Mistake:** Agent makes 5 unrelated changes in one commit: "Fixed lint, updated docs, added feature, refactored component, bumped dependency"

**Why It's a Problem:** Hard to review, hard to revert if one piece breaks.

**The Fix:** Use separate commits:

```bash
git commit -m "Add acceptance test for D-pad navigation"
git commit -m "Implement focus trap fix in GridLayout"
git commit -m "Update AGENTS.md with focus navigation rule"
git push
```

All commits go in the same PR. Reviewer can follow the story.

---

## Summary

If you are an AI agent:

1. Read this file before making changes
2. Follow the handoff loop for every task
3. Write acceptance tests first (TDD)
4. Classify blast radius (green/yellow/red)
5. Suggest a review level
6. Capture proof (commands + CI status)
7. Open a PR, never merge
8. Move repeated mistakes up the stack (code → lint → rules)
9. For TV changes: test remote control, check platform variants, verify focus navigation
10. When in doubt, ask the repository owner

The goal is not to replace human developers. The goal is to make human developers more effective by automating the routine and verifying the critical. Trust is built incrementally, starting with one agent doing one loop correctly.

---

**Questions?** Open an issue or ping @giolaq.
