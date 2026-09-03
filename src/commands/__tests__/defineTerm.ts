import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
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
import defineTerm from '../defineTerm'

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

it('appends the generated dictionary entry to the cursor thought', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() =>
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toContain(`apple: ${appleDefinition}`),
    )
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/defineTerm', {
    body: JSON.stringify({ term: 'apple' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apple: ${appleDefinition}`)
})

it('sends visible text and preserves formatting while escaping the definition', async () => {
  acknowledgeAiDisclosure()
  const definition = 'A comparison where <angle brackets>\nand ampersands & remain literal text.'
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition }) })
  await dispatch([importText({ text: '- <b>Dog</b>' }), setCursor(['<b>Dog</b>'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  })

  expect(mockFetch).toHaveBeenCalledWith(
    'http://test-ai-url/defineTerm',
    expect.objectContaining({ body: JSON.stringify({ term: 'Dog' }) }),
  )
  const cursor = store.getState().cursor!
  expect(getThoughtById(store.getState(), head(cursor))?.value).toBe(
    '<b>Dog</b>: A comparison where &lt;angle brackets&gt; and ampersands &amp; remain literal text.',
  )
})

it('shows the AI disclosure before sending the term', async () => {
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()
})

it('continues the current request after allowing AI once', async () => {
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])
  executeCommand(defineTerm)

  const continuation = acceptAiDisclosure({ remember: false })
  continuation?.()
  await act(async () => {
    await vi.waitFor(() =>
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toContain(`apple: ${appleDefinition}`),
    )
  })

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

it('surfaces an AI service error without changing the thought', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Model unavailable' }),
    status: 500,
  })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().error).toBe('Model unavailable'))
  })

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

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().alert?.value).toBe('Rate limit reached. Please try again later.'))
  })
})

it('reports an invalid AI response', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition: '' }) })
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().error).toBe('Failed to define term'))
  })
})

it('does not overwrite an edit made while inference is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request so the test controls when generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ definition: string }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  })
  await dispatch(editThoughtByContext(['apple'], 'apples'))
  resolveAiRequest({ json: () => Promise.resolve({ definition: appleDefinition }) })
  await act(async () => {
    await vi.waitFor(() =>
      expect(getThoughtById(store.getState(), head(store.getState().cursor!))?.generating).toBe(false),
    )
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - apples`)
})

it('is disabled without a selection or on an empty or already-defined thought', async () => {
  expect(defineTerm.canExecute!(store.getState())).toBe(false)

  await dispatch([importText({ text: '- ' }), setCursor([''])])
  expect(defineTerm.canExecute!(store.getState())).toBe(false)

  await initStore()
  await dispatch([importText({ text: '- apple: a fruit' }), setCursor(['apple: a fruit'])])
  expect(defineTerm.canExecute!(store.getState())).toBe(false)
})

it('is disabled while a definition request is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request after the command gating is asserted. */
  let resolveAiRequest: (response: { json: () => Promise<{ definition: string }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  })
  expect(defineTerm.canExecute!(store.getState())).toBe(false)

  resolveAiRequest({ json: () => Promise.resolve({ definition: appleDefinition }) })
  await act(async () => {
    await vi.waitFor(() =>
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toContain(`apple: ${appleDefinition}`),
    )
  })
})

describe('multicursor', () => {
  it('appends a definition to every selected thought concurrently', async () => {
    acknowledgeAiDisclosure()
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: chickenDefinition }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
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

    executeCommandWithMulticursor(defineTerm, { store })
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - potato
  - chicken: ${chickenDefinition}
  - apple: ${appleDefinition}`)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://test-ai-url/defineTerm',
      expect.objectContaining({ body: JSON.stringify({ term: 'chicken' }) }),
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://test-ai-url/defineTerm',
      expect.objectContaining({ body: JSON.stringify({ term: 'apple' }) }),
    )
  })

  it('preserves the cursor and multicursor selection', async () => {
    acknowledgeAiDisclosure()
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: chickenDefinition }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerm, { store })
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    const state = store.getState()
    expectPathToEqual(state, state.cursor, [`chicken: ${chickenDefinition}`])
    expect(multicursorValues()).toEqual([`apple: ${appleDefinition}`, `chicken: ${chickenDefinition}`])
  })

  it('reverts all appended definitions with one undo', async () => {
    acknowledgeAiDisclosure()
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: chickenDefinition }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerm, { store })
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })
    await dispatch(undo())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
  - apple`)
    expect(store.getState().alert?.value).toBe('Undo: Define Term')
  })

  it('leaves failed thoughts unchanged while applying successful definitions', async () => {
    acknowledgeAiDisclosure()
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Model unavailable' }),
        status: 500,
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerm, { store })
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
  - apple: ${appleDefinition}`)
    expect(store.getState().error).toBe('Model unavailable')
  })

  it('requests disclosure once before defining the full selection', async () => {
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: chickenDefinition }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    executeCommandWithMulticursor(defineTerm, { store })
    expect(store.getState().showModal).toBe('aiDisclosure')
    expect(mockFetch).not.toHaveBeenCalled()

    const continuation = acceptAiDisclosure({ remember: false })
    continuation?.()
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('is disabled when any selected thought already contains a definition', async () => {
    acknowledgeAiDisclosure()
    await dispatch([
      importText({ text: '- chicken\n- apple: a fruit' }),
      setCursor(['chicken']),
      addMulticursor(['chicken']),
      addMulticursor(['apple: a fruit']),
    ])

    expect(defineTerm.canExecute!(store.getState())).toBe(false)
    executeCommandWithMulticursor(defineTerm, { store })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken
  - apple: a fruit`)
  })

  it('defines a cursorless multiselect', async () => {
    acknowledgeAiDisclosure()
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: chickenDefinition }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ definition: appleDefinition }) })
    await dispatch([
      importText({ text: '- chicken\n- apple' }),
      setCursor(null),
      addMulticursor(['chicken']),
      addMulticursor(['apple']),
    ])

    expect(defineTerm.canExecute!(store.getState())).toBe(true)
    executeCommandWithMulticursor(defineTerm, { store })
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - chicken: ${chickenDefinition}
  - apple: ${appleDefinition}`)
    expect(store.getState().cursor).toBeNull()
  })
})
