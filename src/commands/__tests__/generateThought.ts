import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursorFirstMatch } from '../../test-helpers/setCursorFirstMatch'
import executeCommand from '../../util/executeCommand'
import generateThoughtCommand from '../generateThought'

// Mock fetch for testing
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  initStore()
  vi.clearAllMocks()
})

describe('generateThought - webpage title fetching', () => {
  it('should fetch and set webpage title when cursor is on empty thought with URL child', async () => {
    const text = `
      - 
        - https://example.com
    `

    // Mock successful HTML response with title
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Example Title</title></head><body></body></html>'),
    })

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
    })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Example Title
    - https://example.com`)
  })

  it('should handle HTML entities in webpage title', async () => {
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

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
    })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Test & Example (Company)
    - https://example.com`)
  })

  it('should handle URLs without protocol', async () => {
    const text = `
      - 
        - example.com
    `

    // Mock successful response for URL without protocol
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Example Site</title></head><body></body></html>'),
    })

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
    })

    // Verify fetch was called with https:// prefix
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object))

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Example Site
    - example.com`)
  })

  it('should handle fetch failure gracefully and leave thought empty', async () => {
    const text = `
      - 
        - https://example.com
    `

    // Mock fetch failure for webpage
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
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

  it('should handle empty or missing title tags and leave thought empty', async () => {
    const text = `
      - 
        - https://example.com
    `

    // Mock HTML response without title tag
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><head></head><body><h1>No Title</h1></body></html>'),
    })

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
    })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - 
    - https://example.com`)
  })

  it('should not fetch title when thought is not empty', async () => {
    const text = `
      - Some existing text
        - https://example.com
    `

    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')

    // Mock AI response
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ content: ' additional content', err: null }),
    })

    await dispatch([importText({ text }), setCursorFirstMatch(['Some existing text'])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
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

  it('should not fetch title when first child is not a URL', async () => {
    const text = `
      - 
        - Not a URL
    `

    // Mock AI URL environment variable
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')

    // Mock AI response
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ content: 'AI generated text', err: null }),
    })

    await dispatch([importText({ text }), setCursorFirstMatch([''])])

    // Execute the command using the test helper
    await act(async () => {
      executeCommand(generateThoughtCommand)
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
})
