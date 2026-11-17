# Schema

A draft local database design tool using the MatiQ Solutions **desktop** SDK 0.1.6. One renderer in this repository is used in the SDK standalone shell and the Solutions hosted shell. The Solutions repository holds only a prototype registry reference.

## Prototype

Use Node 22.12 or newer. Install with `npm ci --ignore-scripts`, run `npm test`, then `npm run prototype -- --suite <solutions-checkout>`. The matching Solutions SDK and shell release must be available. Register the existing Voice and Companion prototype checkouts with that suite before building its full catalog. Generated `.prototype/`, bundles and local registration paths stay ignored. Serve the export through the authorized private review service.

The editor uses `@dbml/core` for DBML parsing and PostgreSQL conversion; `esbuild` produces the browser bundle. No framework or shell has been replaced. `src/app.mjs`, `src/schema.mjs`, `src/index.html` and `src/style.css` are maintained once. `prototype/bridge.js` simulates native persistence with browser storage. No database server, model or external account is needed.

Try editing DBML, invalid syntax, table search, dragging headers, zoom/Fit, Auto layout, table inspection, PostgreSQL import/export, Projects and Settings. Save project or Save preferences, then reload to verify browser persistence. The sample is an illustrative six-table schema, not a copy of a private production database.

## Approval boundary

`prototype/approval.json` remains draft. Explicit owner approval of both shells is required before native implementation, packaging, signing, installation or release. `npm start` and package commands intentionally fail while approval is missing. Native adapter and preload files remain the generated SDK scaffold; they do not yet implement this renderer's project contract.

This prototype is not a production release. Native files and folders, multi-project storage, OS lifecycle/unsaved-work protection, signed marketplace packages, independent updates and restart/install qualification remain pending. The suite's existing install/update controls are simulations. Preview saves share one slot per browser origin. Browser export is real text conversion; native export dialogs are not qualified.

See `docs/prototype-validation.md` for evidence and limits.
