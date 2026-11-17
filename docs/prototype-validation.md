# Draft prototype validation

Date: 2026-11-17. SDK and shell: 0.1.6. No owner approval has been recorded.

## Focused tests

Run `npm test`. Five parser tests cover the six-table/seven-relationship sample, quoted schema/table names and composite references, invalid DBML, PostgreSQL round trip, and exact DBML export. Bridge tests cover preview persistence and visible read/write failures. The current DBML parser mode (`dbmlv2`) accepts optional relationship syntax emitted by the SQL importer; the legacy parser does not.

## Browser checks

The actual renderer was reviewed through private HTTPS in Chrome in standalone and Solutions-hosted modes. Adding a table updated counts and cards. Invalid DBML displayed its line error while keeping the previous valid diagram. Project saves survived reload; toggled column-type preferences survived save/reload. PostgreSQL export/import restored six tables and seven references. Search dimmed five nonmatching tables for `users`; zoom controls changed the canvas scale. The existing marketplace began with Schema not installed, required an explicit simulated install, and then opened the hosted renderer. Hosted editing also added a seventh table, and table inspection displayed `public.users`. Diagram/Projects appeared in the shared top bar, and the gear opened the actual Schema settings page inside unified Solutions Settings.

## Limits

This is browser prototype evidence, not native desktop qualification. Native persistence, workers/lifecycle, installers, signing/notarization, signed package installation, independent updates and OS restart behavior are untested and blocked on explicit design approval. Large-schema performance remains unqualified; later export and dialect checks are recorded below. The source parser bundle is about 15 MiB; production optimization is deferred. The pinned SDK/runtime dependency audit reports moderate transitive advisories; release qualification must assess them without silently changing the approved SDK. No production application or external diagram was modified.


## Relationship and import/export revision

The owner requested rigid connectors, relationship-end symbols, cell dividers and broader import/export. The draft now uses field-attached horizontal/vertical paths with routes around table rectangles. Endpoint symbols cover one, many, zero-or-one and zero-or-many; shared-field symbols use separate ports. Tables have field rows and key/name/type column dividers. Fit accounts for both canvas dimensions.

The import dialog reads local files or pasted text: DBML, PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, Rails schema.rb and CSV. CSV headers become text columns; no data rows or foreign keys are invented. Export supports DBML and PostgreSQL/MySQL/SQL Server/Oracle SQL, plus full-diagram PNG, PDF and SVG. PDF contains a raster diagram. SQL preserves declared types; database-specific type compatibility requires review rather than silent translation.

Focused tests cover supported schema conversions, invalid/duplicate CSV headers, relationship cardinalities, field attachments, self-references and obstacle routing. Chrome checks include actual local CSV file selection/import, all fourteen sample endpoint symbols, cell rules, PNG/PDF/SVG downloads, a full exported PNG visual inspection, plus hosted PNG and PDF downloads. The one-to-one/many-to-many browser fixture produced distinct endpoint cardinalities (1, 1, *, *). Browser event notification timed out for one successful PNG download; file bytes and dimensions were independently verified. Native desktop file dialogs and packages remain unqualified and approval remains draft.

Reference study used the owner's open dbdiagram without editing its schema, plus official DBML relationship documentation and dbdiagram editing/export and CSV import documentation. Full feature parity, database connections, collaborative cloud sharing, large-schema performance, and every SQL dialect grammar are not claimed.


## Compact layout and DBSchema name

Renamed the display name to DBSchema across the manifest, package, prototype, shells and marketplace. Stable tool identity and browser persistence keys are preserved. Import, Export and Save moved to the existing SDK header. The prototype adapter now follows the same data-matiq-nav controls as the native SDK. Project metadata is in the editor pane header and the editor/diagram fills the remaining height, replacing the prior toolbar and notice band. Both modes opened Import/Export from the top bar and Save remained connected. At an 839px standalone viewport, the diagram/editor stage measured 728px high and the document had no vertical overflow. Native implementation is still unapproved.
