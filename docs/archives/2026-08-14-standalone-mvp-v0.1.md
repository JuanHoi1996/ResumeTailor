---
title: ResumeTailor standalone MVP V0.1
date: 2026-08-14
status: implemented
tags:
  - local-first
  - resume
  - grounded-analysis
---

# ResumeTailor standalone MVP V0.1

## Solved problem

Given one JD and one resume, make an evidence-constrained recommendation about which experience units should form this application version.

## Confirmed product boundaries

- Input is JD text, resume text (pasted or extracted from `.docx`/`.pdf`) and optional explicitly confirmed user facts.
- Step 1 provides evidence, gaps and concrete questions. Step 2 proposes experience-unit retention, placement, rewriting and omission.
- `resume_quote` must exist verbatim in the resume. `user_confirmed` must equal an explicit user answer. They remain separately labelled.
- Unsubstantiated numbers, role upgrades and degree upgrades are rejected from AI suggestions. Browser-side edits are explicitly labelled as user edits that need re-checking.
- Model keys are server-only; no job board, application tracker, account system, cloud database, Word template write-back or model request log is included.

## Implemented flow

```text
Paste JD + upload or paste resume
→ optionally confirm facts
→ server performs grounded analysis
→ Step 1 evidence / gaps / questions
→ Step 2 user selects, orders and edits experience units
→ copy an application-version draft
```

## Verification

- `node --test tests/*.test.mjs`: 2 passing tests.
- `node node_modules/next/dist/bin/next build`: passing production build.

## File extraction boundary

DOCX is converted to plain text with Mammoth; PDF uses its text layer via pdf.js. Scans, images, complex columns and visual formatting can fail to extract accurately. The MVP does not edit or recreate Word templates; users review extracted text first.

## Next step

Test against anonymized examples and assess Step 1 before expanding Step 2 behavior. Create a remote GitHub repository only after that feedback loop; preserve the current JSON contract instead of adding a shared package prematurely.
