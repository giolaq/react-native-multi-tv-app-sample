# Claude (Anthropic) Code Editor Rules

**For Claude Code, Claude.ai Projects, or any Anthropic LLM working in this repository:**

Read **[AGENTS.md](./AGENTS.md)** in full before making any changes.

That file contains:

- Core operating rule (follow the handoff loop, don't write code without acceptance tests)
- Blast radius classification (green/yellow/red)
- Review levels (human, AI-1/2/3)
- Security constraints (no secrets, no merging, sandbox-only)
- TV platform-specific rules (D-pad navigation, platform file extensions, Vega vs non-Vega)
- Lessons learned (acceptance tests must run in CI, proof must include GitHub checks, review final diff)

**Quick checklist for every task:**

1. ✅ Read the issue/ticket
2. ✅ Write an acceptance test first (TDD)
3. ✅ Classify blast radius (🟢 green / 🟡 yellow / 🔴 red)
4. ✅ Implement the fix and fuzz test it
5. ✅ Run commands locally and capture proof (exact terminal output)
6. ✅ Open a PR (never merge), fill out the template completely
7. ✅ Verify GitHub CI checks pass on your PR's latest commit
8. ✅ Review the final diff for leftover debug/scratch changes
9. ✅ Report back with proof, blast radius, and review level

**For TV changes specifically:**

- Test with D-pad remote control (up/down/left/right/select/back)
- Verify focus navigation reaches all interactive elements
- Test on Vega app and at least one non-Vega platform
- Check platform file variants (.kepler.ts, .android.ts, .ios.ts) if applicable

**Red blast-radius changes require human review by @giolaq. Never merge PRs yourself.**

---

**This file exists because Claude and Cursor/Codex/other tools may read different rule files. AGENTS.md is the source of truth. If they conflict, AGENTS.md wins.**
