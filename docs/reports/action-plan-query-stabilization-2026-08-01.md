# ActionPlan Query Stabilization - 2026-08-01

## Context

Two production symptoms exposed regressions in generic conversation handling:

- A named-month financial request could include records from later months.
- A generic herd-count question could fall through as an unrecognized request.

The local bot suite also exposed four related cases where standalone conversation
controls (such as cancellation, correction, confirmation, and negation) were
treated as new operational requests when no pending action existed.

## Decisions

- Named month values now normalize to the closed `between` date operator. They
  represent a calendar month, never an open-ended `since` range.
- The ActionPlan prompt includes named-month finance and generic herd-count
  examples, plus the corresponding semantic requirements.
- Conversation controls without a pending action are routed through the existing
  generic dialogue handler before normal ActionPlan processing. This preserves
  safe clarification and confirmed-record correction behavior without adding
  phrase-specific operational parsing.
- The real-provider regression script is capped at 50 calls and includes the two
  reported production messages.

## Verification

- `npm test`: 199/199 passed; Gemini is mocked and live calls are 0.
- `npm run test:bot`: passed.
- `npm run build`: passed.
- Real ActionPlan batch: 50/50 successful OpenRouter Gemini calls, interpretation
  only, with no records saved.

## Follow-up Guidance

Keep ActionPlan as the intent and semantic-query source. The backend should only
canonicalize contract aliases, authorize, validate, execute, and retain safe
conversation state; do not reintroduce keyword intent routing for these cases.

## Detailed Production Queries

- A detailed production request is now expressed generically by the ActionPlan
  through `semantic.report.detailLevel=detalhado` and `operation=listar`. The
  same semantic contract applies to every query domain, not only finance.
- The production response now lists each authorized, filtered milking with its
  date, animal, liters, and available shift/destination. Long lists remain
  paginated through the existing ActionPlan pagination state.
- Production totals and averages are derived from the filtered result rows.
  They no longer become zero when the model correctly requests the records but
  omits a redundant `sum(litros)` aggregation.
- Offline regression coverage includes a 30-day detailed production query with
  two animals, a nonmatching row outside the period, no explicit aggregation,
  and assertions for the listed records, total, and end-of-list state.
