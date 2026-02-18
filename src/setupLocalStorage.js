// This file must run FIRST before any modules are evaluated
// It ensures localStorage is mocked before storageCache.ts runs its module-level code
// that calls storage.getItem() to build initialCache
import 'vitest-localstorage-mock'

vi.stubGlobal('localStorage', globalThis.localStorage)
