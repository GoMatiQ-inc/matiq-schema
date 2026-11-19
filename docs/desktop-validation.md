# DBSchema 0.1.0 desktop validation

The owner explicitly approved implementation on 2026-11-18: “after those adjustments the prototype is approved. Build the app.” The native release was built from f70e560; subsequent commits add test coverage and documentation without changing its application source or bundle.

## Passing checks

- 27 focused Node tests cover DBML parsing, all supported import/export conversions, geometry, source ranges, diagnostics, atomic project storage, damaged data and safe Downloads filenames.
- Real Electron standalone and hosted workflows pass on Linux and macOS: editing, live table/line movement before pointer release, source selection, DBML errors, file upload, direct DBML/SVG/PNG/PDF exports, saved settings and process restart persistence.
- A newer synthetic tool version containing the real DBSchema implementation stages through the SDK; unsaved work blocks restart; saved source and preferences survive activation in a new host process. This uses development signing and synthetic versions, not a previous published DBSchema release.
- The Mac Apple Silicon standalone app was company signed, notarized and stapled. Strict signature verification, Gatekeeper assessment and stapler validation pass on the build and target Macs.
- The signed marketplace package was extracted from that already built app with SDK pack-app and signed by the existing Solutions publisher. The exact packaged standalone app and exact release-signed package passed native workflows and restart persistence on both Macs. Package delivery during isolated hosted tests uses a local file transport; package verification, installation, execution and persistence use the real SDK.
- DBSchema 0.1.0 is installed on the target Mac. Installed app.asar matches the qualified artifact hash. Private installer and marketplace package links are served through the existing private review service.
- Every passing desktop test verifies owned process and captured listener absence. No models, background workers, databases or development servers are needed.

## Release limits

This artifact qualifies darwin-arm64 only. Windows, Intel Mac and Linux installers are not signed/native-release qualified. The owner authorized public repository and release publication on 2026-11-18. DBSchema v0.1.0 and its qualified artifacts are published on GitHub; the signed Solutions catalog includes the same package version and hash. The installed signed Solutions app passed live catalog refresh, explicit package download/verification/installation over public HTTPS and an update check in an isolated profile, without installing other tools.

The browser prototype remains a browser-storage simulation. Native projects use one current local project slot; export DBML for named schema backups. A multi-project library is outside this release. Declared SQL types are preserved rather than translated between database dialects.

## Reproduction

Install the pinned lockfile under the host storage guard, build the UI, and run npm test. For native source checks, set DBSCHEMA_SUITE to the reviewed Solutions checkout and run scripts/native-test.cjs under a finite timeout (xvfb-run on Linux). For exact native artifact checks, additionally set DBSCHEMA_EXECUTABLE to the packaged executable and DBSCHEMA_PACKAGE to its signed .mqt beside the .release.json descriptor. DBSCHEMA_PROOF optionally writes a compact receipt. Tests create and remove isolated profiles and Downloads directories.

Preserve the matching suite checkout when validating the SDK approval digest. Restore the generated renderer bundle using the pinned esbuild build command before prototype check. Release artifacts, credentials, dependencies and machine-specific evidence do not belong in source control.


## Public Marketplace reproduction

Run scripts/marketplace-test.cjs on a native target with SOLUTIONS_EXECUTABLE set to the installed signed Solutions executable. It launches the actual packaged suite in a disposable profile, checks the current live signed catalog, explicitly installs DBSchema from its public release URL and checks installed-tool updates. No network or catalog mocks are used. It verifies owned-process/listener cleanup and removes the test profile. Optional DBSCHEMA_PROOF and DBSCHEMA_SCREENSHOT retain compact evidence. This release-specific smoke check expects DBSchema 0.1.0; update its expectation when qualifying a later release.
