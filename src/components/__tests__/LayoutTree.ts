import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// Mock LayoutTree to track render count
const mockLayoutTreeRender = vi.fn()
vi.mock('../../components/LayoutTree', async () => {
  const actual = await vi.importActual('../../components/LayoutTree')
  return {
    default: (...args: unknown[]) => {
      mockLayoutTreeRender(...args)
      return (actual as { default: (...args: unknown[]) => unknown }).default(...args)
    },
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await createTestApp()
})
afterEach(cleanupTestApp)

it('unmount TreeNodes on collapse', async () => {
  await dispatch(
    importText({
      text: `
        - a
          - b
        - c
      `,
    }),
  )

  await act(vi.runOnlyPendingTimersAsync)

  // a is initially collapsed because cursor is set to c after import
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)

  await dispatch(setCursor(['a']))

  // expand a
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(3)

  await dispatch(setCursor(['c']))
  await act(vi.runOnlyPendingTimersAsync)

  // collapse a and unmount b
  expect(document.querySelectorAll('[aria-label="tree-node"]').length).toBe(2)
})

describe('render count tests', () => {
  it('renders at most 4 times on load', async () => {
    await dispatch(
      importText({
        text: `
          - a
          - b
        `,
      }),
    )

    await act(vi.runOnlyPendingTimersAsync)

    expect(mockLayoutTreeRender).toHaveBeenCalledTimes(4)
  })

  it('renders at most 4 times when creating a new thought', async () => {
    // Clear previous calls from setup
    vi.clearAllMocks()

    await dispatch(newThought({ value: 'test thought' }))
    await act(vi.runOnlyPendingTimersAsync)

    expect(mockLayoutTreeRender).toHaveBeenCalledTimes(4)
  })

  it('renders at most 4 times when navigating between thoughts', async () => {
    // Setup some thoughts first
    await dispatch(
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
    )

    // Clear previous calls from setup
    vi.clearAllMocks()

    // Navigate between thoughts
    await dispatch(setCursor(['a']))
    await act(vi.runOnlyPendingTimersAsync)

    expect(mockLayoutTreeRender).toHaveBeenCalledTimes(4)
  })
})
