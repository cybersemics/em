// This file ensures jest global is available before any modules are loaded
// This is particularly important for CI environments where module loading order can be unpredictable
// Import vi from vitest immediately
import { vi } from 'vitest'

// Set up jest global on all possible global objects immediately
global.jest = vi
globalThis.jest = vi
if (typeof window !== 'undefined') window.jest = vi

// Ensure jest.fn is available
global.jest.fn = vi.fn
globalThis.jest.fn = vi.fn
if (typeof window !== 'undefined') window.jest.fn = vi.fn
