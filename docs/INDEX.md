# Documentation index

The map to CryptoIdea's documentation. Each subject has one canonical hub that links its detail
files; open the hub for a subject, not a spoke directly. New to the project? Start with the README and
CONTRIBUTING.

## Start here

- [README](../README.md) — what CryptoIdea is, how to run it locally, and how to deploy your own.
- [CONTRIBUTING](../CONTRIBUTING.md) — local setup, the test tiers, the invariants, and the change flow.
- [CHANGELOG](../CHANGELOG.md) — the development history (the one place dates live).

## Architecture

- [ARCHITECTURE](decisions/ARCHITECTURE.md) — the layered system and the rules (the hub). Links:
- [src/ARCHITECTURE](../src/ARCHITECTURE.md) — the `src/` layer detail.
- [CODEBASE-MAP](product/CODEBASE-MAP.md) — a map of every directory and file.
- [DATA-FLOW](product/DATA-FLOW.md) — how a write and a read move through the layers.

## Security

- [SECURITY](security/SECURITY.md) — the security model (the hub). Links:
- [API-SECURITY](security/API-SECURITY.md) — the HTTP surface, key handling, and the incident runbook.
- [ISOLATION](security/ISOLATION.md) — the per-user data-isolation model.

## Product & decisions

- [PRODUCT-DECISIONS](decisions/PRODUCT-DECISIONS.md) — the product/pricing/AI decisions (the hub). Links:
- [PRICING](decisions/PRICING.md) — tiers, limits, and revenue math.
- [BILLING](decisions/BILLING.md) — the subscription lifecycle (dormant; paid plans ship off).
- [CACHE-POLICY](decisions/CACHE-POLICY.md) — the flat-cost market-data cache and the AI budget.
- [BACKEND-ADMIN-DECISIONS](decisions/BACKEND-ADMIN-DECISIONS.md) — the admin/back-end model.
- [AI](product/AI.md) — AI status (off today) and what turning it on requires.
- [CALCULATOR](product/CALCULATOR.md) — the free DCA calculator.
- [USER-CREATION](product/USER-CREATION.md) · [USER-SETTINGS](product/USER-SETTINGS.md) — accounts and settings.
- [USER-BENEFITS](product/USER-BENEFITS.md) — what each tier gives a user.
- [DATA-INTEGRITY](product/DATA-INTEGRITY.md) — the counter/consistency safeguards.
- [GO-LIVE-AUDIT](product/GO-LIVE-AUDIT.md) — the deploy runbook and remaining launch steps (rationale + detail).
- [LAUNCH](product/LAUNCH.md) — the condensed, tickable launch checklist (do-it-in-order).
- [LEGAL](product/LEGAL.md) — disclaimer, privacy/terms posture.

## Design

- [DESIGN](design/DESIGN.md) — the editorial paper design system (the hub). Links:
- [RESPONSIVE-DESIGN](design/RESPONSIVE-DESIGN.md) — one layout, phone to desktop, no media queries.

## Testing

- [TESTING](testing/TESTING.md) — the three test tiers (the hub). Links:
- [ERRORS](testing/ERRORS.md) — the catalog of diagnosed errors and fixes.
- [JIRA-WORKFLOW](testing/JIRA-WORKFLOW.md) · [JIRA-PLAYBOOK](testing/JIRA-PLAYBOOK.md) — the bug workflow and ticket templates.

## Process & delivery

- [AGILE](product/AGILE.md) — the delivery workflow and Definition of Done.
- [PR-WORKFLOW](product/PR-WORKFLOW.md) — one PR, one task, one review.
- [interview](interview.md) — the interview-and-consistency process and the topic map.
- [AGENT-FACTORY](product/AGENT-FACTORY.md) · [BUILD-LOOP](product/BUILD-LOOP.md) — the multi-agent build system and its ledger.
- [NEXT-STEPS](product/NEXT-STEPS.md) — the prioritized backlog.

## Resources

- [How to research crypto](planning/how-to-research-crypto.md) — a generic, forkable research + investing-principles methodology.
- [Diagrams](diagrams/README.md) — the architecture diagrams index.
