# Prototype contract

`manifest.json` points to the actual renderer in `src/`. `bridge.js` is the only mock desktop boundary. Both shell modes export from this source through SDK 0.1.6. The native adapter is unchanged from the scaffold and awaits explicit owner approval.

For a full suite rebuild, register compatible repository-owned Voice and Companion prototypes, then register Schema and run `prototype build --suite <suite-checkout>`. Initial review used the Voice `codex/prototype-first` commit `68ba09c` and Companion `codex/prototype-first` commit `6b599ed`, with Solutions main `0322587` and the Schema draft branch. Preserve the same shared shell path for approval and later checks.

`approval.json` must remain draft until the owner explicitly approves both reviewed views. Feedback alone is not approval. Generated exports and local checkout maps are ignored.
