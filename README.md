# DBSchema

A draft local database design tool using the MatiQ Solutions **desktop** SDK 0.1.6. One renderer in this repository is used in the SDK standalone shell and the Solutions hosted shell. The Solutions repository holds only a prototype registry reference.

## Prototype

Use Node 22.12 or newer. Install with `npm ci --ignore-scripts`, run `npm test`, then `npm run prototype -- --suite <solutions-checkout>`. The matching Solutions SDK and shell release must be available. Register the existing Voice and Companion prototype checkouts with that suite before building its full catalog. Generated `.prototype/`, bundles and local registration paths stay ignored. Serve the export through the authorized private review service.

The editor uses `@dbml/core` for DBML parsing and SQL conversion; `esbuild` produces the browser bundle. No framework or shell has been replaced. `src/app.mjs`, `src/schema.mjs`, `src/index.html` and `src/style.css` are maintained once. `prototype/bridge.js` simulates native persistence with browser storage. No database server, model or external account is needed.

Try editing DBML, invalid syntax, table search, dragging headers, zoom/Fit, Auto layout, table inspection, SQL/file import and DBML/SQL/PNG/PDF/SVG export, Projects and Settings. Save project or Save preferences, then reload to verify browser persistence. The sample is an illustrative six-table schema, not a copy of a private production database.

## Approval boundary

`prototype/approval.json` remains draft. Explicit owner approval of both shells is required before native implementation, packaging, signing, installation or release. `npm start` and package commands intentionally fail while approval is missing. Native adapter and preload files remain the generated SDK scaffold; they do not yet implement this renderer's project contract.

This prototype is not a production release. Native files and folders, multi-project storage, OS lifecycle/unsaved-work protection, signed marketplace packages, independent updates and restart/install qualification remain pending. The suite's existing install/update controls are simulations. Preview saves share one slot per browser origin. Browser file import and export are real local operations; native export dialogs are not qualified. SQL export preserves declared types rather than translating database-specific types.

See `docs/prototype-validation.md` for evidence and limits.


## DBSchema desktop workflow

The owner approved implementation on 2026-11-18 after requesting parser diagnostics, format dropdowns, live connectors and DBML source navigation. The renderer is shared by the standalone SDK host and an explicitly installed Solutions package.

- Edit DBML locally. Parser errors mark the line/range and appear in a clickable problem list. The last valid diagram remains visible.
- Drag table headers; connectors follow during movement. Select a connector to drag its routing handle. Clicking a table or connector selects its DBML definition.
- Import opens a format menu then a local file/text dialog. Export chooses a format and writes directly to Downloads in the desktop app, using a numbered filename when necessary.
- Save project stores DBML, positions, connector bends and preferences atomically in the SDK-provided data directory. Unsaved edits block close/update. Export DBML for named backups; the current project slot is not a multi-project library.
- No cloud service, account, model or worker is required.

### Focused checks

`npm test` checks parsing, imports/exports, routing, diagnostics, local project storage and safe download filenames. `npm run build:ui` creates the ignored renderer bundle. `npm run test:native` exercises the real Electron standalone workflow and restart persistence in a disposable profile. Set `DBSCHEMA_SUITE` to the matching Solutions checkout to add real package installation, hosted workflow and unified settings checks with a fixture signing key. On Linux run native tests with a finite timeout under `xvfb-run`.

`npm run package:release` uses the SDK temporary signing/notarization credential wrappers on macOS. Package the resulting application resources with `matiq-tool pack-app`, then qualify that exact signed package in Solutions before release. Development-key tests do not qualify release signing, installation on another OS or notarization. Source dependencies remain pinned; release output and local registrations are ignored.
