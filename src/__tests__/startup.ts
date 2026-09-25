import { screen } from '@testing-library/react'
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'

const { acquireAccess, initialize, waitForInitialized, flags, roots } = vi.hoisted(() => ({
  acquireAccess: vi.fn(),
  initialize: vi.fn(),
  waitForInitialized: vi.fn(),
  flags: { preventInitialize: false, thoughtspaceStorage: null },
  roots: [] as Root[],
}))

vi.mock('../util/consoleProxy', () => ({}))
vi.mock('../data-providers/thoughtspace', () => ({ thoughtspaceRuntime: { acquireAccess } }))
vi.mock('../initialize', () => ({ initialize, waitForInitialized }))
vi.mock('../serviceWorkerRegistration', () => ({ register: vi.fn() }))
vi.mock('../e2e/testFlags', () => ({ default: flags }))
// The startup gate owns when the downstream editor mounts, not the editor's own rendering behavior.
vi.mock('../components/App', () => ({ default: () => createElement('button', null, 'Editor ready') }))
vi.mock('react-dom/client', async importOriginal => {
  const original = await importOriginal<typeof import('react-dom/client')>()
  return {
    ...original,
    createRoot: (...args: Parameters<typeof original.createRoot>) => {
      const root = original.createRoot(...args)
      roots.push(root)
      return root
    },
  }
})

beforeEach(() => {
  vi.resetModules()
  acquireAccess.mockReset().mockResolvedValue({ status: 'acquired' })
  initialize.mockReset().mockResolvedValue(undefined)
  waitForInitialized.mockReset().mockResolvedValue(undefined)
  flags.preventInitialize = false
  const container = document.createElement('div')
  container.id = 'root'
  document.body.append(container)
})

afterEach(async () => {
  await act(async () => {
    roots.splice(0).forEach(root => root.unmount())
  })
  document.getElementById('root')!.remove()
  vi.restoreAllMocks()
})

it('keeps the editor unmounted until thoughtspace initialization finishes', async () => {
  let finishInitialization!: () => void
  initialize.mockReturnValue(
    new Promise<void>(resolve => {
      finishInitialization = resolve
    }),
  )

  await act(async () => {
    await import('../index')
  })

  expect(screen.getByRole('status')).toHaveTextContent('Opening your thoughtspace')
  expect(screen.queryByRole('button', { name: 'Editor ready' })).not.toBeInTheDocument()

  await act(async () => finishInitialization())

  expect(screen.getByRole('button', { name: 'Editor ready' })).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(initialize).toHaveBeenCalledWith({ storage: 'persistent' })
})

it('keeps delayed startup behind the same initialization gate', async () => {
  flags.preventInitialize = true
  let finishInitialization!: () => void
  waitForInitialized.mockReturnValue(
    new Promise<void>(resolve => {
      finishInitialization = resolve
    }),
  )

  await act(async () => {
    await import('../index')
  })

  expect(screen.getByRole('status')).toHaveTextContent('Opening your thoughtspace')
  expect(screen.queryByRole('button', { name: 'Editor ready' })).not.toBeInTheDocument()
  expect(initialize).not.toHaveBeenCalled()

  await act(async () => finishInitialization())

  expect(screen.getByRole('button', { name: 'Editor ready' })).toBeInTheDocument()
})

it('shows initialization failures without opening the editor', async () => {
  const failure = new Error('Persistent storage is unavailable')
  initialize.mockRejectedValue(failure)
  const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await act(async () => {
    await import('../index')
  })

  expect(screen.getByRole('alert')).toHaveTextContent('Persistent storage is unavailable')
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Editor ready' })).not.toBeInTheDocument()
  expect(logError).toHaveBeenCalledWith('Thoughtspace initialization failed', failure)
})

it('shows the access-blocked screen without initializing or opening the editor', async () => {
  acquireAccess.mockResolvedValue({ status: 'blocked', reason: 'already-open' })

  await act(async () => {
    await import('../index')
  })

  expect(screen.getByRole('heading', { name: 'em is already open' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Editor ready' })).not.toBeInTheDocument()
  expect(initialize).not.toHaveBeenCalled()
})
