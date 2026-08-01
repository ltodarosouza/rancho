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

## Pagination Consistency Audit

The audit covered every query renderer that can expose a partial result.
Previously, some renderers visually offered `mostrar mais` but did not retain
an `action_plan_pagination` continuation. A valid follow-up could then be
interpreted as a new request and lose its original domain, filters, and page.

- Continuation now accepts the equivalent, validated ActionPlan placements for
  the operation: top-level `operation`, `semantic.operation`, or
  `semantic.intent`. It never infers pagination from the user text alone.
- Reproduction events, stock items, stock movements, health and observation
  events, lots, generic lists, and employee clock records retain the next page
  in the ActionPlan session state whenever more data exists.
- Production and finance already had dedicated output renderers; their detail
  pages now follow the same session continuation contract. Production pages
  preserve the filtered total while showing the next records.
- Employee clock records page by employee, not by raw clock entry, matching
  the unit shown to the user.
- New offline tests exercise one continuation whose operation is top-level,
  detailed production pagination, and stock pagination. They assert that the
  next page starts at the correct record and stays in the original domain.

## Verification Update

- `npm test`: 202/202 passed; Gemini is mocked and live calls are 0.
- `npm run test:bot`: passed.
- `npm run build`: passed.

## Inactive Animal Maintenance

The status guard correctly prevented operational records for animals marked as
sold, inactive, deceased, or otherwise outside the herd. However, it was also
applied before an already interpreted `ATUALIZACAO_ANIMAL` could reach its
normal confirmation and save flow. As a result, a valid request to reactivate
an animal was rejected with the same guidance that suggested reactivation.

- Non-operational animal maintenance now passes through the normal ActionPlan
  confirmation flow even when the current animal status is inactive. This
  covers status corrections and other authorized registry maintenance, not a
  hardcoded animal or wording.
- Animal events represented through `ATUALIZACAO_ANIMAL` remain blocked while
  the animal is inactive, as do production, health, reproduction, and death
  flows. The change does not permit an inactive animal to receive new
  operational records.
- Regression coverage verifies that an ActionPlan update to `status=ativo` is
  allowed to proceed, while milk production and event-shaped updates remain
  blocked.

## Final Verification

- `npm test`: 203/203 passed; Gemini is mocked and live calls are 0.
- `npm run test:bot`: passed.
- `npm run build`: passed.

## Animal And Reproduction Query Completion

The remaining production reports were not interpretation failures alone. The
ActionPlan could express a precise request, but some response and validation
paths discarded useful plan semantics after the model had supplied them.

- A specific-animal query now honors `select`. Requests for a lot, birth date,
  weight, status, or another registered field return that field instead of an
  unrelated full record. Lot names are resolved through the authorized lots
  relation, and birth dates use Brazilian display formatting.
- The full animal record now also includes lot and birth date, which prevents
  those registered values from silently disappearing when the user asks for a
  broader history.
- Collective animal references that reach the executor as a plural category
  are resolved as categories rather than mistaken for an individual animal.
  The ActionPlan prompt still asks the model for `categoria`, while this bridge
  makes the backend tolerant of an equivalent valid semantic shape. Count
  aggregations are canonicalized to `id` before validation, so counts work for
  all catalog domains without requiring a numeric measure field.
- Reproduction queries distinguish current reproductive state from historical
  events. A period filter or an event/history semantic now lists the actual
  matching events. Thus, "which cows calved this year" returns every PARTO
  event in the year rather than only animals whose current state happens to be
  parida.
- For a message that combines a current/history query with a future or
  conditional mutation, the ActionPlan contract now requires the model to put
  the query first. The executor returns that query immediately and retains the
  mutation as a normal pending confirmation. Queries stay after a mutation
  only when the user explicitly asks for a post-confirmation result.

## Regression Coverage And Verification Update

- Added offline ActionPlan coverage for specific animal lot and birth-date
  queries, collective active-bull counts, calving-event history in the current
  year, and history-before-pending-sale sequences.
- `npm test`: 207/207 passed; Gemini is mocked and live calls are 0.
- `npm run test:bot`: passed.
- `npm run build`: passed.
