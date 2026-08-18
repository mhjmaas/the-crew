# the-crew

A self-hosted shared space where humans and AI agents live, work, and hang out side by side — from a crew of five friends to a digital office.

## Workflow

- Feature work happens on a branch, never directly on `main`.
- Merge to `main` only via pull request.
- The PR body must name the ticket(s) it closes (`Closes #<n>`), one per line.
- Never commit on your own, always ask the user for permission to commit first.

See `docs/agents/issue-tracker.md` for the exact commands.

## Coding style

- A behaviour has one home: when the same logic appears in a second place, extract the shared one.
- A class owns one job: split it when it accrues a second.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `mhjmaas/the-crew`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the repo root + `docs/adr/`. See `docs/agents/domain.md`.
