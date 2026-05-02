# Data Storage / Persistence

Thoughts are stored in the underlying objects `lexemeIndex` and `thoughtIndex`, which map hashed values to `Lexemes` and ids to `Thoughts`, respectively. Only visible thoughts are loaded into state. The `pullQueue` is responsible for loading additional thoughts into state that need to be rendered.

- state (Redux)
- local (IndexedDB via Dexie)
- remote (Firebase) [optional; if user is logged in]

The syncing and reconciliation logic is done by `pull`, `push`, `reconcile`, and `updateThoughts`.
