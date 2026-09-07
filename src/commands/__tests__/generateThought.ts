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
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
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
    json: () => Promise.resolve({ thoughts: ['Replacement text'] }),
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
  expect(JSON.parse(mockFetch.mock.calls[0][1]?.body as string)).toEqual({ inputs: [expect.any(String)] })

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
    json: () => Promise.resolve({ thoughts: ['AI generated text'] }),
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
    json: () => Promise.resolve({ thoughts: ['broccoli'] }),
  })

  await dispatch([importText({ text }), setCursor(['Grocery list', 'carrot']), newThought({ value: '' })])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: ['[] Grocery list\n  [] potato\n  [] carrot\n  [x]'] }),
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
    json: () => Promise.resolve({ thoughts: ['garlic'] }),
  })

  await dispatch([importText({ text }), setCursor(['onion'])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: ['[] potato\n[] carrot\n[x] onion'] }),
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
    json: () => Promise.resolve({ thoughts: ['garlic'] }),
  })

  await dispatch([importText({ text }), setCursor(['Grocery list', 'onion'])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: ['[] Grocery list\n  [] potato\n  [] carrot\n  [x] onion'] }),
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
    await vi.runAllTimersAsync()
  })
  expect(store.getState().error).toBe('Failed to generate thought')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - original`)
  expect(store.getState().cursorCleared).toBe(false)

  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thoughts: ['replacement'] }),
  })

  await act(async () => {
    executeCommand(generateThought)
    await vi.runAllTimersAsync()
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - replacement`)

  vi.unstubAllEnvs()
})

test('preserve the original thought when the AI returns an empty replacement', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thoughts: ['  '] }),
  })

  await dispatch([importText({ text: '- original' }), setCursor(['original'])])

  await act(async () => {
    executeCommand(generateThought)
    await vi.runAllTimersAsync()
  })
  expect(store.getState().error).toBe('Failed to generate thought')

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
    json: () => Promise.resolve({ thoughts: ['AI generated text'] }),
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
    json: () => Promise.resolve({ thoughts: ['replacement'] }),
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

// An edit made while a generation is in flight must remain its own undo step. Grouping the generation's undo
// step by holding a command transaction open across the request's async window would absorb the user's edit into
// the Generate Thought step, so a single undo would revert both the generation and the edit.
// The interleaved edit is a deletion (Shorter) while the generation is an addition (Longer): contiguous edits in
// the same direction legitimately merge into one undo step, so only an opposite-direction edit isolates the
// grouping behavior under test.
test('preserve an edit made while the thought is generating as its own undo step', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  /** Resolves the pending AI request. Assigned when the mocked fetch is called, so the test controls exactly when the generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ thoughts: string[] }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )

  await dispatch([
    importText({
      text: `
        - a
        - banana
      `,
    }),
    setCursor(['a']),
  ])

  await act(async () => {
    executeCommand(generateThought)
  })

  // Precondition: the request is in flight and the cursor thought shows the pending value.
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a...
  - banana`)

  // The user deletes a character from another thought while the generation is still pending.
  await dispatch(editThought(['banana'], 'banan'))

  await act(async () => {
    resolveAiRequest({ json: () => Promise.resolve({ thoughts: ['a generated'] }) })
  })

  // Precondition: the generation was applied after the interleaved edit.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a generated
  - banan`)

  await dispatch(undo())

  // Undo reverts only the generation. The interleaved edit is a separate undo step and must survive.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - banan`)

  vi.unstubAllEnvs()
})

// Unlike the deletion above, an addition matches the generation's own direction (Longer), so without explicit
// isolation the contiguous-edit rule would merge the generation into the user's edit.
test('preserve an addition made while the thought is generating as its own undo step', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  /** Resolves the pending AI request. Assigned when the mocked fetch is called, so the test controls exactly when the generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ thoughts: string[] }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )

  await dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
  ])

  await act(async () => {
    executeCommand(generateThought)
  })

  // Precondition: the request is in flight and the cursor thought shows the pending value.
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a...
  - b`)

  // The user adds characters to another thought while the generation is still pending.
  await dispatch(editThought(['b'], 'bee'))

  await act(async () => {
    resolveAiRequest({ json: () => Promise.resolve({ thoughts: ['a generated'] }) })
  })

  // Precondition: the generation was applied after the interleaved edit.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a generated
  - bee`)

  await dispatch(undo())

  // Undo reverts only the generation. The interleaved edit is a separate undo step and must survive.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - bee`)

  vi.unstubAllEnvs()
})

// The generation is likewise isolated on the other side: an edit made after it completes never merges into its
// undo step, so the first undo reverts only that edit.
test('preserve the generated value when an edit made after generation is undone', async () => {
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thoughts: ['a generated'] }),
  })

  await dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
  ])

  await act(async () => {
    executeCommand(generateThought)
  })

  // The user adds characters to another thought after the generation has completed.
  await dispatch(editThought(['b'], 'bee'))

  // Precondition: both the generation and the edit were applied.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a generated
  - bee`)

  await dispatch(undo())

  // Undo reverts only the edit that followed the generation.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a generated
  - b`)

  vi.unstubAllEnvs()
})

test('continues the current request after always allowing AI', async () => {
  const text = `
      -${' '}
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ thoughts: ['AI generated text'] }),
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
    json: () => Promise.resolve({ thoughts: ['AI generated text'] }),
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

    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two'] }) })

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

    // Flush the mocked request so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    // Every selected thought is sent in one request, each with its own outline built from the original values.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateThought', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [
          '[] Grocery list\n  [x] potato\n  [] carrot\n  [] onion',
          '[] Grocery list\n  [] potato\n  [x] carrot\n  [] onion',
        ],
      }),
    })

    vi.unstubAllEnvs()
  })

  it('replaces each selected thought', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    // The selected thoughts are sent in document order, so the thoughts in the response are applied to a, b, c in
    // turn. Distinct content proves each thought in the response is applied to its own thought.
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two', 'three'] }) })

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

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

    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two', 'three'] }) })

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

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

    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two'] }) })

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    // Precondition: both thoughts were generated, otherwise there would be no completion that could have moved the
    // cursor.
    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['one'])
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([['one'], ['two']])
  })

  it('leaves every selected thought unchanged when the request returns an error', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'Model unavailable' }),
      status: 500,
    })

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    // Both thoughts are left at their original values, without the pending ellipsis.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
    expect(store.getState().error).toBe('Model unavailable')

    vi.unstubAllEnvs()
  })

  it('leaves every selected thought unchanged when the response omits a thought', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one'] }) })

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

    // Flush the mocked request so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    // A response that cannot be matched to the selection is rejected as a whole rather than applied to the first thought.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
    expect(store.getState().error).toBe('Failed to generate thought')

    vi.unstubAllEnvs()
  })

  it('fetches webpage titles alongside one AI request for a mixed selection', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    // The URL-title thoughts each fetch their own webpage, and the remaining thoughts share one AI request. The
    // requests are started in document order: the webpage first, then the AI request.
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><head><title>Example Title</title></head><body></body></html>'),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two'] }) })

    await dispatch([
      importText({
        text: `
          -${' '}
            - https://example.com
          - a
          - b
        `,
      }),
      setCursor(['']),
      addMulticursor(['']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(generateThought, { store })
    })

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://example.com', expect.any(Object))
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://test-ai-url/generateThought', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: ['[]\n[x] a\n[] b', '[]\n[] a\n[x] b'] }),
    })
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Example Title
    - https://example.com
  - one
  - two`)

    vi.unstubAllEnvs()
  })

  it('replaces every selected thought when there is no cursor', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ thoughts: ['one', 'two'] }) })

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

    // Flush the mocked requests so that every generation has been applied and the undo bracket has closed.
    await act(() => vi.runAllTimersAsync())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - one
  - two`)

    vi.unstubAllEnvs()
  })
})
