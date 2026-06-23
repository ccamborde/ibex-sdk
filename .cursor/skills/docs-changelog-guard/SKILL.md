---
name: docs-changelog-guard
description: Keep documentation changelogs up to date. Use when modifying any docs/*.md file, especially API or SDK contract docs, to add a clear top-level changelog entry in the same file.
---

# Docs Changelog Guard

## Purpose

Avoid forgotten changelog updates when documentation files change.

## When To Use

Use this skill whenever a change is made to any `docs/*.md` file, especially:

- `docs/IBEXFISDK_ENDPOINTS.md`
- `docs/IBEXFIAPI_ENDPOINTS_v1.2.md`
- integration or contract documentation files

## Required Workflow

1. Update the documentation content requested by the user.
2. In the same commit scope, update the file's `## Changelog` section.
3. Add the new changelog line at the top (most recent first).
4. Keep the entry concise and contract-oriented:
   - date (`YYYY-MM-DD`)
   - action (`create` | `modify` | `remove` | `note`)
   - affected method/type/endpoint
   - behavior-level impact

## Entry Format

Use this format:

`- **YYYY-MM-DD** \`action\` \`target\`: short impact statement.`

Examples:

- `- **2026-06-23** `modify` `IbexDevToolsCompanyCheckResponse` type: aligned with structured response fields instead of legacy OK/KO.`
- `- **2026-06-23** `create` `POST /v1.2/example`: added new endpoint for ...`

## Constraints

- Do not invent endpoints or fields not present in repository docs.
- Keep docs language in English unless the user explicitly requests another language.
- If a file has no `## Changelog`, ask the user before creating a new section.
