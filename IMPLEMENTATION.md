# Implementation Notes

This React/Vite tool runs inside Power Platform ToolBox. `App.tsx` composes the active connection, ToolBox APIs, Dataverse service, and UI. Dataverse metadata and record creation are isolated in `src/utils/dataverse.tsx`; Mockaroo generation is in `src/utils/mockaroo.tsx`; shared record-count and batch logic is in `src/utils/bulkOperations.ts`.

The manifest requires Power Platform ToolBox 1.2.7 or later through `features.minAPI`.

## Data-write safety

- Both direct table creation and dataset execution require explicit confirmation that names the active environment and target table(s), scope, and record counts.
- The dataset review captures the selected connection, dataset order, configuration contents, and per-table row counts. Applying the review checks that the active connection and saved dataset/configurations have not changed.
- Record generation and creation are capped at 1,000 records per table/step. Dataverse requests are sent in batches of 100, with at most three batches in flight.
- Successful record IDs are retained for counting. Failures report confirmed successful batches; there is no automatic rollback.
- Each batch rechecks the active connection before it is sent.

## External service and privacy

Mockaroo generation uses `https://api.mockaroo.com` and is declared as a `connect-src` CSP exception in `package.json`. The API key and generation schema/configuration are sent to that endpoint. Existing Dataverse records and generated values are not logged by the tool.

## Tests

- `tests/model/*.test.ts` covers model initialization, configuration serialization, and saved-setting keys.
- `tests/utils/*.test.ts` covers record limits, bounded batch execution and partial failures, Dataverse payload conversion/connection checks, Mockaroo requests and response handling, and notifications.
- `tests/hooks/*.test.ts` covers ToolBox connection/event/log hook behavior with mocked host APIs.
- `tests/components/DatasetTab.test.tsx` covers saved-config rendering with light and dark Fluent themes.
- `tests/components/MockarooMain.test.tsx` covers the dataset creation review warning message and the header's record total, alignment, and matching text size.
- `tests/testHelpers.ts` contains shared mocked ToolBox API setup.
- UI interaction and live Dataverse acceptance remain manual checks inside Power Platform ToolBox; this repository does not launch the tool in a standalone browser for those checks.

Commands:

- `npm test` — run all automated tests.
- `npm test -- tests/components/DatasetTab.test.tsx` — run saved-config theme regression tests.
- `npm test -- tests/components/MockarooMain.test.tsx` — run dataset review header and warning tests.
- `npm test -- tests/utils/bulkOperations.test.ts` — run the batch and record-limit tests.
- `npm run build` — type-check and create the production bundle.
- `npx pptb-validate` — validate the package manifest and distribution metadata.

## Manual testing checklist

Run these checks inside Power Platform ToolBox against a disposable development or sandbox Dataverse environment, not production. Use synthetic data, check for plug-ins or flows triggered by record creation, and plan cleanup: the tool has no automatic rollback. Leave items unchecked until a person has verified the result; automated tests and screenshots alone do not complete this checklist.

### Setup and appearance

- [x] Load the final packaged build in PPTB 1.2.2 or later; record the tool version, PPTB version, tester, date, and test environment.
- [x] Verify light and dark themes, including switching themes while the tool is open. Confirm readable grids, saved-config lists, dataset order, dropdowns, and dialogs.
- [x] Check keyboard navigation, visible focus, scrolling, and dialog actions at typical and narrow window sizes.
- [x] Confirm opening the tool, selecting a table, generating a preview, and cancelling confirmation do not create Dataverse records.

### Configuration and generation

- [x] Save and reload configurations and datasets, including after closing and reopening the tool; verify field settings, row counts, and dataset order are preserved.
- [x] Verify generated text, numeric, date, boolean, choice, and lookup fields, plus fixed-value-only configurations without a Mockaroo key.
- [x] Test missing/invalid API keys, Mockaroo request failures, and missing required choice/lookup selections. Confirm actionable errors and no unintended writes.
- [x] Test lookup searches with matches, empty results, and apostrophes; verify the selected record is used.
- [x] Test row counts of 1 and 1,000, and confirm invalid counts (0, negative, fractional, or above 1,000) are rejected.
- [x] Verify generated row counts match the request. Confirm an empty, malformed, or count-mismatched Mockaroo response prevents dataset writes; mark this blocked if it cannot be safely exercised.

### Record creation and datasets

- [x] Review and cancel direct creation, then confirm a small run. Verify the displayed environment, table, and count match the actual created records and field values.
- [x] Run an ordered dataset across multiple tables. Verify review totals, the right-aligned header total, yellow warning box, execution order, and per-table results.
- [x] Review a dataset with missing configurations or unavailable tables; confirm skipped-step warnings and that a dataset with no runnable steps cannot proceed.
- [x] Change a saved configuration or dataset after review; verify creation is blocked until reviewed again.
- [x] Change or remove the active connection after review; verify writes are blocked rather than sent to the wrong environment.
- [x] Exercise a 1,000-record step and a realistic multi-step dataset; verify responsiveness and successful counts against Dataverse.
- [x] Safely induce a later batch or step failure; verify confirmed successful counts, explicit partial-failure reporting, and that previously created records remain.
- [x] Test missing read/create permissions and an expired or disconnected session. Confirm errors are surfaced without reporting success.

### Privacy and completion

- [ ] Inspect requests and logs using synthetic inputs: confirm external requests only use the declared Mockaroo endpoint, lookup GUID handling matches the privacy disclosure, and API keys/generated values are not written to application logs.
- [ ] Verify failures to save settings are reported accurately and do not falsely claim that an API key, configuration, or dataset was saved.
- [ ] Inspect created records and any triggered automation, clean up test data, and record pass/fail/blocked results with redacted evidence. Resolve failures before submission.

See the [user guide](./README.md).
