---
description: File a well-formed bug into the Jira project CRYP from a description or the current conversation
argument-hint: <short description of what's broken>
---

File a bug in Jira project **CRYP** describing: $ARGUMENTS

If nothing was supplied above, use the bug being discussed in this conversation. If neither exists,
stop and ask what the bug is — never invent one.

## 1 · Resolve the target (don't assume)

- `getAccessibleAtlassianResources` → the `cloudId`. For `cryptoidea.atlassian.net` this is currently
  `b7ec4223-6688-45aa-8872-d34ff7713570`, but re-resolve rather than trusting that if any call fails.
- `getVisibleJiraProjects` → confirm **CRYP** exists. If it doesn't, stop and say so.
- `getJiraProjectIssueTypesMetadata` → confirm a **Bug** type exists (it does today, id `10006`).
  If it's missing, fall back to **Task** and say which you used.

The Jira tools are exposed by the Atlassian MCP server under a `mcp__<server-id>__` prefix whose
middle segment is an install-specific id — match tools by their bare names (`createJiraIssue`,
`getJiraIssue`, …), never by a hardcoded full name.

## 2 · Gather the facts BEFORE writing the ticket

A bug report is only useful if someone can reproduce it. Establish, from the conversation or by
looking at the code:

- **What breaks**, in one specific sentence (not "portfolio is broken").
- **Where** — `file.js:LINE` for the suspected code path, if known.
- **Steps to reproduce**, numbered.
- **Expected vs actual.**
- **Which test tier would prove it** — unit / rules / integration / callables. This matters because it
  decides where the regression test goes. See [`JIRA-WORKFLOW.md`](../../docs/testing/JIRA-WORKFLOW.md).
- **Environment**, when it's a UI or PWA bug: desktop vs iPhone, and **installed PWA (standalone) vs
  Safari tab** — iOS behaves differently in standalone and a bug that only reproduces in one mode
  wastes hours if that isn't recorded.

If you can't establish steps to reproduce, say so in the ticket rather than guessing.

## 3 · Create it

`createJiraIssue` with `projectKey: "CRYP"`, `issueTypeName: "Bug"`, `contentFormat: "markdown"`, and a
description following this shape:

```
**Symptom:** what the user sees
**Where:** file.js:LINE (or "unknown — needs diagnosis")
**Steps to reproduce:**
1. …
**Expected:** …
**Actual:** …
**Proven by:** which test tier should carry the regression test
**Environment:** desktop / iPhone · installed PWA or browser tab · emulator or prod
```

Keep the markdown simple — Jira's dialect is not GitHub's (`*bold*` renders as *italic*), so prefer
plain `**bold**` labels and plain lists.

**Severity/priority:** this project is team-managed and has **no `priority` field**. Express urgency
with labels via `additional_fields`, e.g. `{"labels": ["bug", "prio-high"]}`. Don't try to set
`priority` — the field doesn't exist here and the call will not do what you expect.

## 4 · Report back

Print the issue key and its browse URL (`https://cryptoidea.atlassian.net/browse/<KEY>`), then tell the
user the next step verbatim:

> Fix it with `/jira-fix <KEY>` — that writes the failing test first.

Do **not** start fixing it in this command. Filing and fixing are separate steps on purpose: the
ticket is the record that the bug existed before anyone touched the code.
