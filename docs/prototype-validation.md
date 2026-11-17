# Draft prototype validation

Date: 2026-11-17. SDK and shell: 0.1.6. No owner approval has been recorded.

## Focused tests

Run `npm test`. Five parser tests cover the six-table/seven-relationship sample, quoted schema/table names and composite references, invalid DBML, PostgreSQL round trip, and exact DBML export. Bridge tests cover preview persistence and visible read/write failures. The current DBML parser mode (`dbmlv2`) accepts optional relationship syntax emitted by the SQL importer; the legacy parser does not.

## Browser checks

The actual renderer was reviewed through private HTTPS in Chrome in standalone and Solutions-hosted modes. Adding a table updated counts and cards. Invalid DBML displayed its line error while keeping the previous valid diagram. Project saves survived reload; toggled column-type preferences survived save/reload. PostgreSQL export/import restored six tables and seven references. Search dimmed five nonmatching tables for `users`; zoom controls changed the canvas scale. The existing marketplace began with Schema not installed, required an explicit simulated install, and then opened the hosted renderer. Hosted editing also added a seventh table, and table inspection displayed `public.users`. Diagram/Projects appeared in the shared top bar, and the gear opened the actual Schema settings page inside unified Solutions Settings.

## Limits

This is browser prototype evidence, not native desktop qualification. Native persistence, workers/lifecycle, installers, signing/notarization, signed package installation, independent updates and OS restart behavior are untested and blocked on explicit design approval. Large-schema performance, image export and additional SQL dialects are not qualified. The source parser bundle is about 15 MiB; production optimization is deferred. The pinned SDK/runtime dependency audit reports moderate transitive advisories; release qualification must assess them without silently changing the approved SDK. No production application or external diagram was modified.
