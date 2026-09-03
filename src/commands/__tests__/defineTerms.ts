import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked } from '../../selectors/getChildren'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import multicursorValues from '../../test-helpers/multicursorValues'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { acceptAiDisclosure, acknowledgeAiDisclosure, clearAiDisclosureAcknowledgement } from '../../util/aiDisclosure'
import head from '../../util/head'
import defineTerms from '../defineTerms'

const appleDefinition = 'A round, edible fruit with crisp flesh that grows on trees.'
const chickenDefinition = 'A domesticated bird raised worldwide for eggs, meat, feathers, and companionship.'
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

it('adds the generated dictionary entry as a subthought of the cursor thought', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definitions: [appleDefinition] }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/defineTerms', {
    body: JSON.stringify({ terms: ['apple'] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apple
    - ${appleDefinition}`)
})

it('inserts the definition before existing subthoughts', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definitions: [appleDefinition] }) })
  await dispatch([importText({ text: '- apple\n  - red\n  - green' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apple
    - ${appleDefinition}
    - red
    - green`)
})

it('sends visible text and preserves formatting while escaping the definition', async () => {
  acknowledgeAiDisclosure()
  const definition = 'A comparison where <angle brackets>\nand ampersands & remain literal text.'
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definitions: [definition] }) })
  await dispatch([importText({ text: '- <b>Dog</b>' }), setCursor(['<b>Dog</b>'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()

  expect(mockFetch).toHaveBeenCalledWith(
    'http://test-ai-url/defineTerms',
    expect.objectContaining({ body: JSON.stringify({ terms: ['Dog'] }) }),
  )
  const cursor = store.getState().cursor!
  expect(getThoughtById(store.getState(), head(cursor))?.value).toBe('<b>Dog</b>')
  expect(getChildrenRanked(store.getState(), head(cursor)).map(child => child.value)).toEqual([
    'A comparison where &lt;angle brackets&gt; and ampersands &amp; remain literal text.',
  ])
})

it('shows the AI disclosure before sending the term', async () => {
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()
})

it('continues the current request after allowing AI once', async () => {
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definitions: [appleDefinition] }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])
  executeCommand(defineTerms)

  const continuation = acceptAiDisclosure({ remember: false })
  continuation?.()
  await vi.runAllTimersAsync()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toContain(appleDefinition)

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

it('surfaces an AI service error without changing the thought', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Model unavailable' }),
    status: 500,
  })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()
  expect(store.getState().error).toBe('Model unavailable')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apple`)
})

it('asks the user to retry after reaching the rate limit', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Rate limit reached' }),
    status: 429,
  })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()
  expect(store.getState().alert?.value).toBe('Rate limit reached. Please try again later.')
})

it('reports an invalid AI response', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definitions: [''] }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()
  expect(store.getState().error).toBe('Failed to define terms')
})

it('does not overwrite an edit made while inference is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request so the test controls when generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ definitions: string[] }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()
  expect(mockFetch).toHaveBeenCalledTimes(1)
  await dispatch(editThoughtByContext(['apple'], 'apples'))
  resolveAiRequest({ json: () => Promise.resolve({ definitions: [appleDefinition] }) })
  await vi.runAllTimersAsync()
  expect(getThoughtById(store.getState(), head(store.getState().cursor!))?.generating).toBe(false)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apples`)
})

it('is disabled without a selection or on an empty thought', async () => {
  expect(defineTerms.canExecute!(store.getState())).toBe(false)

  await dispatch([importText({ text: '- ' }), setCursor([''])])
  expect(defineTerms.canExecute!(store.getState())).toBe(false)
})

it('is disabled while a definition request is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request after the command gating is asserted. */
  let resolveAiRequest: (response: { json: () => Promise<{ definitions: string[] }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerms)
  await vi.runAllTimersAsync()
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(defineTerms.canExecute!(store.getState())).toBe(false)

  resolveAiRequest({ json: () => Promise.resolve({ definitions: [appleDefinition] }) })
  await vi.runAllTimersAsync()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toContain(appleDefinition)
})

describe('multicursor', () => {
  it('adds a definition under every selected thought using one API request', async () => {
    acknowledgeAiDisclosure()
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition, appleDefinition] }),
    })
    await dispatch([
      importText({
        text: `
          - potato
          - chicken
          - apple
        `,
      }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerms, { store })
    await vi.runAllTimersAsync()

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - potato
  - chicken
    - ${chickenDefinition}
  - apple
    - ${appleDefinition}`)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-ai-url/defineTerms',
      expect.objectContaining({ body: JSON.stringify({ terms: ['chicken', 'apple'] }) }),
    )
  })

  it('preserves the cursor and multicursor selection', async () => {
    acknowledgeAiDisclosure()
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition, appleDefinition] }),
    })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerms, { store })
    await vi.runAllTimersAsync()

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['chicken'])
    expect(multicursorValues()).toEqual(['apple', 'chicken'])
  })

  it('reverts all added definitions with one undo', async () => {
    acknowledgeAiDisclosure()
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition, appleDefinition] }),
    })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerms, { store })
    await vi.runAllTimersAsync()
    await dispatch(undo())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
  - apple`)
    expect(store.getState().alert?.value).toBe('Undo: Define Terms')
  })

  it('leaves all thoughts unchanged when the batch response omits a definition', async () => {
    acknowledgeAiDisclosure()
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition] }),
    })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerms, { store })
    await vi.runAllTimersAsync()

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
  - apple`)
    expect(store.getState().error).toBe('Failed to define terms')
  })

  it('requests disclosure once before defining the full selection', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition, appleDefinition] }),
    })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerms, { store })
    expect(store.getState().showModal).toBe('aiDisclosure')
    expect(mockFetch).not.toHaveBeenCalled()

    const continuation = acceptAiDisclosure({ remember: false })
    continuation?.()
    await vi.runAllTimersAsync()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('defines a cursorless multiselect', async () => {
    acknowledgeAiDisclosure()
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ definitions: [chickenDefinition, appleDefinition] }),
    })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(null),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    expect(defineTerms.canExecute!(store.getState())).toBe(true)
    executeCommandWithMulticursor(defineTerms, { store })
    await vi.runAllTimersAsync()

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
    - ${chickenDefinition}
  - apple
    - ${appleDefinition}`)
    expect(store.getState().cursor).toBeNull()
  })
})
