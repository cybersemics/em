import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import isMulticursorPath from '../../selectors/isMulticursorPath'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { acceptAiDisclosure, acknowledgeAiDisclosure, clearAiDisclosureAcknowledgement } from '../../util/aiDisclosure'
import head from '../../util/head'
import organizeThought from '../organizeThought'

/** A valid reorganization that wraps apples and bananas in a Fruit category. */
const fruitOutline = [
  {
    id: null,
    text: 'Fruit',
    children: [
      { id: '1', text: null, children: [{ id: '2', text: null, children: [] }] },
      { id: '3', text: null, children: [] },
    ],
  },
]

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(async () => {
  await initStore()
  mockFetch.mockReset()
  clearAiDisclosureAcknowledgement()
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('is disabled without a selection', () => {
  expect(organizeThought.canExecute!(store.getState())).toBe(false)
})

it('is enabled for a single thought and for sibling thoughts', async () => {
  await dispatch([importText({ text: '- apples\n- bananas' }), setCursor(['apples'])])
  expect(organizeThought.canExecute!(store.getState())).toBe(true)

  await dispatch([addMulticursor(['apples']), addMulticursor(['bananas'])])
  expect(organizeThought.canExecute!(store.getState())).toBe(true)
})

it('is disabled when selected thoughts have different parents', async () => {
  await dispatch([
    importText({
      text: `
        - work
          - meeting
        - personal
          - gym
      `,
    }),
    setCursor(['work', 'meeting']),
    addMulticursor(['work', 'meeting']),
    addMulticursor(['personal', 'gym']),
  ])
  expect(organizeThought.canExecute!(store.getState())).toBe(false)
})

it('is disabled in the context view', async () => {
  await dispatch([importText({ text: '- apples' }), setCursor(['apples']), toggleContextView()])
  expect(organizeThought.canExecute!(store.getState())).toBe(false)
})

it('sends numbered selected thoughts and context-only unselected siblings', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ outline: fruitOutline }) })
  await dispatch([
    importText({
      text: `
        - milk
          - 2%
        - apples
          - granny smith
        - bananas
      `,
    }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/organizeThought', {
    body: JSON.stringify({
      outline: `[] milk
[1] apples
  [2] granny smith
[3] bananas`,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
})

it('sends the parent as read-only context when selected thoughts are nested', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        outline: [
          { id: '3', text: null, children: [] },
          { id: '1', text: null, children: [] },
          { id: '2', text: null, children: [] },
        ],
      }),
  })
  await dispatch([
    importText({
      text: `
        - Things in Alphabetical Order
          - States in Alphabetical Order
            - California
            - Wisconsin
            - Alaska
      `,
    }),
    setCursor(['Things in Alphabetical Order', 'States in Alphabetical Order', 'California']),
    addMulticursor(['Things in Alphabetical Order', 'States in Alphabetical Order', 'California']),
    addMulticursor(['Things in Alphabetical Order', 'States in Alphabetical Order', 'Wisconsin']),
    addMulticursor(['Things in Alphabetical Order', 'States in Alphabetical Order', 'Alaska']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(mockFetch).toHaveBeenCalledWith(
    'http://test-ai-url/organizeThought',
    expect.objectContaining({
      body: JSON.stringify({
        outline: `[] States in Alphabetical Order
  [1] California
  [2] Wisconsin
  [3] Alaska`,
      }),
    }),
  )
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Things in Alphabetical Order
    - States in Alphabetical Order
      - Alaska
      - California
      - Wisconsin`)
})

// https://github.com/cybersemics/em/pull/5377#issuecomment-5570203182
it('keeps originally selected thoughts selected after they are recategorized', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ outline: fruitOutline }) })
  await dispatch([
    importText({
      text: `
        - milk
        - apples
          - granny smith
        - bananas
      `,
    }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  const state = store.getState()
  const applesPath = contextToPath(state, ['Fruit', 'apples'])
  const bananasPath = contextToPath(state, ['Fruit', 'bananas'])
  const fruitPath = contextToPath(state, ['Fruit'])
  const milkPath = contextToPath(state, ['milk'])
  expect(applesPath).not.toBeNull()
  expect(bananasPath).not.toBeNull()
  expect(fruitPath).not.toBeNull()
  expect(milkPath).not.toBeNull()
  expect(isMulticursorPath(state, applesPath!)).toBe(true)
  expect(isMulticursorPath(state, bananasPath!)).toBe(true)
  expect(isMulticursorPath(state, fruitPath!)).toBe(false)
  expect(isMulticursorPath(state, milkPath!)).toBe(false)
  expect(Object.keys(state.multicursors)).toHaveLength(2)
  expectPathToEqual(state, state.cursor, ['Fruit', 'apples'])
})

it('categorizes selected thoughts and leaves unselected siblings in place', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ outline: fruitOutline }) })
  await dispatch([
    importText({
      text: `
        - milk
        - apples
          - granny smith
        - bananas
      `,
    }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - milk
  - Fruit
    - apples
      - granny smith
    - bananas`)
})

it('splits a long thought into smaller thoughts', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        outline: [
          { id: '1', text: 'Buy milk', children: [] },
          { id: null, text: 'Buy eggs', children: [] },
          { id: null, text: 'Buy bread', children: [] },
        ],
      }),
  })
  await dispatch([importText({ text: '- Buy milk, eggs, and bread' }), setCursor(['Buy milk, eggs, and bread'])])

  executeCommand(organizeThought)
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Buy milk
  - Buy eggs
  - Buy bread`)
})

it('reorders selected thoughts', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        outline: [
          { id: '2', text: null, children: [] },
          { id: '1', text: null, children: [] },
        ],
      }),
  })
  await dispatch([
    importText({ text: '- apples\n- bananas' }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - bananas
  - apples`)
})

it('leaves thoughts unchanged when the response omits an id', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ outline: [{ id: '1', text: null, children: [] }] }),
  })
  await dispatch([
    importText({ text: '- apples\n- bananas' }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apples
  - bananas`)
  expect(store.getState().error).toBe('Failed to organize thoughts')
})

it('leaves thoughts unchanged when the response invents an id', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        outline: [
          { id: '1', text: null, children: [] },
          { id: '2', text: null, children: [] },
          { id: '99', text: null, children: [] },
        ],
      }),
  })
  await dispatch([
    importText({ text: '- apples\n- bananas' }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apples
  - bananas`)
  expect(store.getState().error).toBe('Failed to organize thoughts')
})

it('shows the AI disclosure before sending thoughts', async () => {
  await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

  executeCommand(organizeThought)

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()
})

it('asks the user to retry after reaching the rate limit', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Rate limit reached' }),
    status: 429,
  })
  await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

  executeCommand(organizeThought)
  await vi.runAllTimersAsync()
  expect(store.getState().alert?.value).toBe('Rate limit reached. Please try again later.')
})

it('does not apply a reorganization after an edit made while inference is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request so the test controls when generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ outline: unknown }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

  executeCommand(organizeThought)
  await vi.runAllTimersAsync()
  expect(mockFetch).toHaveBeenCalledTimes(1)
  await dispatch(editThoughtByContext(['apples'], 'oranges'))
  resolveAiRequest({ json: () => Promise.resolve({ outline: [{ id: '1', text: 'Fruit', children: [] }] }) })
  await vi.runAllTimersAsync()
  expect(getThoughtById(store.getState(), head(store.getState().cursor!))?.generating).toBe(false)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - oranges`)
})

it('is disabled while a reorganization request is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request after the command gating is asserted. */
  let resolveAiRequest: (response: { json: () => Promise<{ outline: unknown }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

  executeCommand(organizeThought)
  await vi.runAllTimersAsync()
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(organizeThought.canExecute!(store.getState())).toBe(false)

  resolveAiRequest({ json: () => Promise.resolve({ outline: [{ id: '1', text: null, children: [] }] }) })
  await vi.runAllTimersAsync()
})

it('reverts the reorganization with one undo', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ outline: fruitOutline }) })
  await dispatch([
    importText({
      text: `
        - milk
        - apples
          - granny smith
        - bananas
      `,
    }),
    setCursor(['apples']),
    addMulticursor(['apples']),
    addMulticursor(['bananas']),
  ])

  executeCommandWithMulticursor(organizeThought, { store })
  await vi.runAllTimersAsync()
  await dispatch(undo())

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - milk
  - apples
    - granny smith
  - bananas`)
  expect(store.getState().alert?.value).toBe('Undo: Organize Thought')

  const state = store.getState()
  const applesPath = contextToPath(state, ['apples'])
  const bananasPath = contextToPath(state, ['bananas'])
  expect(applesPath).not.toBeNull()
  expect(bananasPath).not.toBeNull()
  expect(isMulticursorPath(state, applesPath!)).toBe(true)
  expect(isMulticursorPath(state, bananasPath!)).toBe(true)
  expect(Object.keys(state.multicursors)).toHaveLength(2)
})

it('continues the current request after allowing AI once', async () => {
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ outline: [{ id: '1', text: null, children: [] }] }),
  })
  await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])
  executeCommand(organizeThought)

  const continuation = acceptAiDisclosure({ remember: false })
  continuation?.()
  await vi.runAllTimersAsync()
  expect(mockFetch).toHaveBeenCalledTimes(1)
})
