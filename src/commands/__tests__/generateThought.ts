import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
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

test('not fetch title when thought is not empty', async () => {
  const text = `
      - Some existing text
        - https://example.com
    `

  // Mock AI URL environment variable
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  acknowledgeAiDisclosure()

  // Mock AI response
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ content: ' additional content', err: null }),
  })

  await dispatch([importText({ text }), setCursor(['Some existing text'])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Verify fetch was called only once for AI, not for webpage
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url', expect.any(Object))

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - Some existing text additional content
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
    json: () => Promise.resolve({ content: 'AI generated text', err: null }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Verify fetch was called only once for AI, not for webpage
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url', expect.any(Object))

  const state = store.getState()
  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - AI generated text
    - Not a URL`)

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
    json: () => Promise.resolve({ content: 'AI generated text', err: null }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  const continuation = acceptAiDisclosure({ remember: false })
  await act(async () => {
    continuation?.()
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url', expect.any(Object))

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
    json: () => Promise.resolve({ content: 'generated', err: null }),
  })

  await dispatch([importText({ text: `- a` }), setCursor(['a'])])

  // use act, otherwise pending value (...) will still be rendered
  await act(async () => {
    executeCommand(generateThought)
  })

  // Precondition: the thought was generated, otherwise the undo below would have nothing to revert.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a generated`)

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
  let resolveAiRequest: (response: { json: () => Promise<{ content: string; err: null }> }) => void = () => {}
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
    resolveAiRequest({ json: () => Promise.resolve({ content: 'generated', err: null }) })
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

test('continues the current request after always allowing AI', async () => {
  const text = `
      -${' '}
        - Not a URL
    `

  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ content: 'AI generated text', err: null }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  const continuation = acceptAiDisclosure({ remember: true })
  await act(async () => {
    continuation?.()
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url', expect.any(Object))
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
    json: () => Promise.resolve({ content: 'AI generated text', err: null }),
  })

  await dispatch([importText({ text }), setCursor([''])])

  await act(async () => {
    executeCommand(generateThought)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url', expect.any(Object))
  expect(store.getState().showModal).toBeNull()

  vi.unstubAllEnvs()
})

describe('multicursor', () => {
  it('generates a thought for each selected thought', async () => {
    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    // The selected thoughts are generated concurrently in document order, so the mocked responses are consumed in the
    // order a, b, c. Distinct content proves each response is applied to its own thought.
    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'one', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'two', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'three', err: null }) })

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
  - a one
  - b two
  - c three`)

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
    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'one', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'two', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'three', err: null }) })

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
  - a one
  - b two
  - c three`)

    await dispatch(undo())

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)

    // The whole run is a single undo step labelled with the command, rather than one Edit Thought step per generation.
    expect(store.getState().alert?.value).toBe('Undo: Generate Thought')

    vi.unstubAllEnvs()
  })

  it('keeps the cursor and the multicursor selection after generating', async () => {
    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'one', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'two', err: null }) })

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
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a one
  - b two`)

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['a one'])
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([['a one'], ['b two']])
  })

  it('generates the other selected thoughts when one request returns an error', async () => {
    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ content: '', err: { status: 500, message: 'Model unavailable' } }),
      })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'two', err: null }) })

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
  - b two`)

    expect(store.getState().error).toBe('Model unavailable')

    vi.unstubAllEnvs()
  })

  it('generates a thought for each selected thought when there is no cursor', async () => {
    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    mockFetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'one', err: null }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'two', err: null }) })

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
  - a one
  - b two`)

    vi.unstubAllEnvs()
  })
})
