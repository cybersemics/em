import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import {
  acceptAiDisclosure,
  acknowledgeAiDisclosure,
  allowAiDisclosureOnce,
  clearAiDisclosureAcknowledgement,
  hasAcknowledgedAiDisclosure,
} from '../../util/aiDisclosure'
import headValue from '../../util/headValue'
import generateThought from '../generateThought'

// Mock fetch for testing
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(async () => {
  await initStore()
  vi.clearAllMocks()
  clearAiDisclosureAcknowledgement()
  // clearAllMocks does not drain queued mockResolvedValueOnce responses, which would otherwise leak into the next test
  mockFetch.mockReset()
})

test('fetch and set webpage title when cursor is on empty thought with URL child', async () => {
  const text = `
      - 
        - https://example.com
    `

  // Mock successful HTML response with title
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve('<html><head><title>Example Title</title></head><body></body></html>'),
  })

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Example Title
    - https://example.com`)
})

test('handle HTML entities in webpage title', async () => {
  const text = `
      - 
        - https://example.com
    `

  // Mock HTML response with HTML entities in title
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () =>
      Promise.resolve('<html><head><title>Test &amp; Example &lt;Company&gt;</title></head><body></body></html>'),
  })

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Test & Example (Company)
    - https://example.com`)
})

test('handle URLs without protocol', async () => {
  const text = `
      - 
        - example.com
    `

  // Mock successful response for URL without protocol
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve('<html><head><title>Example Site</title></head><body></body></html>'),
  })

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Verify fetch was called with https:// prefix
  expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object))

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Example Site
    - example.com`)
})

test('handle fetch failure gracefully and leave thought empty', async () => {
  const text = `
      - 
        - https://example.com
    `

  // Mock fetch failure for webpage
  mockFetch.mockRejectedValueOnce(new Error('Network error'))

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Verify only one fetch call was made (for webpage, no AI fallback)
  expect(mockFetch).toHaveBeenCalledTimes(1)

  // Check that error state has been set
  expect(store.getState().error).toBeTruthy()

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - 
    - https://example.com`)
})

test('handle empty or missing title tags and leave thought empty', async () => {
  const text = `
      - 
        - https://example.com
    `

  // Mock HTML response without title tag
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve('<html><head></head><body><h1>No Title</h1></body></html>'),
  })

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - 
    - https://example.com`)
})

test('replace a non-empty thought with the complete generated thought', async () => {
  const text = `
      - Some existing text
        - https://example.com
    `

  // Mock AI URL environment variable
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  // Mock AI response
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'Replacement text' }),
  })

  await dispatch([importText({ text }), setCursor(['Some existing text'])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Verify fetch was called only once for AI, not for webpage
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: expect.any(String),
  })
  expect(JSON.parse(mockFetch.mock.calls[0][1]?.body as string)).toEqual({ input: expect.any(String) })

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Replacement text
    - https://example.com`)

  vi.unstubAllEnvs()
})

test('not fetch title when first child is not a URL', async () => {
  const text = `
      - 
        - Not a URL
    `

  // Mock AI URL environment variable
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  // Mock AI response
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'AI generated text' }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  const generatedCursorOffsets: (number | null)[] = []
  const unsubscribe = store.subscribe(() => {
    const state = store.getState()
    if (state.cursor && headValue(state, state.cursor) === 'AI generated text') {
      generatedCursorOffsets.push(state.cursorOffset)
    }
  })

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })
  unsubscribe()

  // Verify fetch was called only once for AI, not for webpage
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', expect.any(Object))

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - AI generated text
    - Not a URL`)
  expect(generatedCursorOffsets[0]).toBe('AI generated text'.length)

  vi.unstubAllEnvs()
})

test('send ancestors and siblings when generating an empty thought', async () => {
  const text = `
      - Grocery list
        - potato
        - carrot
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'broccoli' }),
  })

  await dispatch([importText({ text }), setCursor(['Grocery list', 'carrot']), newThought({ value: '' })])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '[] Grocery list\n  [] potato\n  [] carrot\n  [x]' }),
  })

  vi.unstubAllEnvs()
})

test('send top-level siblings when generating a top-level thought', async () => {
  const text = `
      - potato
      - carrot
      - onion
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'garlic' }),
  })

  await dispatch([importText({ text }), setCursor(['onion'])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '[] potato\n[] carrot\n[x] onion' }),
  })

  vi.unstubAllEnvs()
})

test('replace a non-empty thought using its ancestors and siblings', async () => {
  const text = `
      - Grocery list
        - potato
        - carrot
        - onion
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'garlic' }),
  })

  await dispatch([importText({ text }), setCursor(['Grocery list', 'onion'])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '[] Grocery list\n  [] potato\n  [] carrot\n  [x] onion' }),
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Grocery list
    - potato
    - carrot
    - garlic`)

  vi.unstubAllEnvs()
})

test('restore the original thought and allow retry when the AI request fails', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockRejectedValueOnce(new Error('Network error'))

  await dispatch([importText({ text: '- original' }), setCursor(['original'])])

  await act(async () => {
    executeCommand(generateThought)
    await vi.waitFor(() => expect(store.getState().error).toBe('Failed to generate thought'))
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - original`)
  expect(store.getState().cursorCleared).toBe(false)

  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'replacement' }),
  })

  await act(async () => {
    executeCommand(generateThought)
    await vi.waitFor(() =>
      expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - replacement`),
    )
  })

  vi.unstubAllEnvs()
})

test('preserve the original thought when the AI returns an empty replacement', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: '  ' }),
  })

  await dispatch([importText({ text: '- original' }), setCursor(['original'])])

  await act(async () => {
    executeCommand(generateThought)
    await vi.waitFor(() => expect(store.getState().error).toBe('Failed to generate thought'))
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - original`)
  expect(store.getState().cursorCleared).toBe(false)

  vi.unstubAllEnvs()
})

test('show AI disclosure and avoid network request before acknowledgement', async () => {
  const text = `
      - 
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - 
    - Not a URL`)
  expect(state.cursorCleared).toBe(false)

  vi.unstubAllEnvs()
})

test('continues the current request after allowing AI once', async () => {
  const text = `
      -${' '}
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'AI generated text' }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  const continuation = acceptAiDisclosure({ remember: false })
  await act(async () => {
    continuation?.()
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', expect.any(Object))

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toBe(`- ${HOME_TOKEN}
  - AI generated text
    - Not a URL`)
  vi.unstubAllEnvs()
})

test('restore the original value rather than the pending value on undo', async () => {
  // Mock AI URL environment variable
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  // Mock AI response
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'replacement' }),
  })

  await dispatch([importText({ text: `- a` }), setCursor(['a'])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Precondition: the thought was generated, otherwise the undo below would have nothing to revert.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - replacement`)

  await dispatch(undo())

  // The pending value "a..." is set with updateThoughts, which is not undoable, so it must be restored to the
  // original value before the generated value is applied. Otherwise undo reverts to "a...".
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a`)

  vi.unstubAllEnvs()
})

test('continues the current request after always allowing AI', async () => {
  const text = `
      -${' '}
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'AI generated text' }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  const continuation = acceptAiDisclosure({ remember: true })
  await act(async () => {
    continuation?.()
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', expect.any(Object))
  expect(hasAcknowledgedAiDisclosure()).toBe(true)

  vi.unstubAllEnvs()
})

test('allow next use without persisting AI disclosure acknowledgement', async () => {
  const text = `
      - 
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  allowAiDisclosureOnce()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thought: 'AI generated text' }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', expect.any(Object))
  expect(store.getState().showModal).toBeNull()

  vi.unstubAllEnvs()
})

describe('multicursor', () => {
  it('builds every prompt from the original sibling values', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'one' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })

    await dispatch([
      importText({
        text: `
          - Grocery list
            - potato
            - carrot
            - onion
        `,
      }),
      setCursor(['Grocery list', 'potato']),
      addMulticursor(['Grocery list', 'potato']),
      addMulticursor(['Grocery list', 'carrot']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://test-ai-url/generateThought', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: '[] Grocery list\n  [x] potato\n  [] carrot\n  [] onion',
      }),
    })
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://test-ai-url/generateThought', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: '[] Grocery list\n  [] potato\n  [x] carrot\n  [] onion',
      }),
    })

    vi.unstubAllEnvs()
  })

  it('replaces each selected thought', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    // The selected thoughts are generated concurrently in document order, so the mocked responses are consumed in the
    // order a, b, c. Distinct content proves each response is applied to its own thought.
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'one' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'three' }) })

    await dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - one
  - two
  - three`)

    vi.unstubAllEnvs()
  })

  it('fetches the webpage title for each selected empty thought with a URL child', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><head><title>First Title</title></head><body></body></html>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><head><title>Second Title</title></head><body></body></html>'),
      })

    await dispatch([
      importText({
        text: `
          - a
            -${' '}
              - https://first.example.com
          - b
            -${' '}
              - https://second.example.com
        `,
      }),
      setCursor(['a', '']),
      addMulticursor(['a', '']),
      addMulticursor(['b', '']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - First Title
      - https://first.example.com
  - b
    - Second Title
      - https://second.example.com`)
  })

  it('reverts every generated thought on a single undo', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'one' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'three' }) })

    await dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    // Precondition: all three thoughts were generated, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - one
  - two
  - three`)

    await dispatch(undo())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)

    // The whole run is a single undo step labelled with the command, rather than one Edit Thought step per generation.
    expect(store.getState().alert?.value).toBe('Undo: Generate Thought')

    vi.unstubAllEnvs()
  })

  it('keeps the cursor and multicursor selection after replacing thoughts', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'one' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })

    await dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    // Precondition: both thoughts were generated, otherwise there would be no completion that could have moved the
    // cursor.
    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['one'])
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([['one'], ['two']])
  })

  it('replaces the other selected thoughts when one request returns an error', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Model unavailable' }),
        status: 500,
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })

    await dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    // a is left at its original value, without the pending ellipsis, and b is generated as usual.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - two`)
    expect(store.getState().error).toBe('Model unavailable')

    vi.unstubAllEnvs()
  })

  it('replaces every selected thought when there is no cursor', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'one' }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thought: 'two' }) })

    await dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(null),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    // The keydown handler gates execution on canExecute against the real state, so a cursorless multiselect would not
    // otherwise reach executeCommandWithMulticursor.
    expect(store.getState().cursor).toBeNull()
    expect(generateThought.canExecute!(store.getState())).toBe(true)

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Wait for every generation to settle. execMulticursor holds the undo bracket open for the whole run, so the flag
    // going false is exactly the condition that all of the requests have been applied.
    await act(async () => {
      await vi.waitFor(() => expect(store.getState().isMulticursorExecuting).toBe(false))
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - one
  - two`)

    vi.unstubAllEnvs()
  })
})
