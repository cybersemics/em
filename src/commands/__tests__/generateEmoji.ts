import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThoughtByContext } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { acceptAiDisclosure, acknowledgeAiDisclosure, clearAiDisclosureAcknowledgement } from '../../util/aiDisclosure'
import head from '../../util/head'
import generateEmoji from '../generateEmoji'

const emojis = ['🐕', '🐕‍🦺', '🦮', '🐾', '🦴', '🐶', '🐩', '🐺', '🏠', '🦊']
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(async () => {
  await initStore()
  vi.clearAllMocks()
  mockFetch.mockReset()
  clearAiDisclosureAcknowledgement()
  vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('prepends the first generated emoji and sends the named AI request', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateEmoji', {
    body: JSON.stringify({ values: ['Dog'] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🐕 Dog`)
})

it('cycles cached emoji without another request and wraps to the beginning', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })
  await act(async () => {
    emojis.slice(1).forEach(() => executeCommand(generateEmoji))
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🦊 Dog`)

  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🐕 Dog`)
})

it('marks the thought as generating while inference is pending', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockReturnValueOnce(new Promise(() => {}))
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(generateEmoji)

  const cursor = store.getState().cursor!
  expect(getThoughtById(store.getState(), head(cursor))).toMatchObject({ generating: true, value: 'Dog...' })
})

it('restores the original value on undo', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })
  await dispatch(undo())

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog`)
})

it('regenerates from an edited concept and replaces its previous generated prefix', async () => {
  acknowledgeAiDisclosure()
  const updatedEmojis = ['🦊', '🐾', '🐕', '🐶', '🦮', '🦴', '🐕‍🦺', '🐩', '🐺', '🏠']
  mockFetch
    .mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
    .mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [updatedEmojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })
  await dispatch(editThoughtByContext(['🐕 Dog'], '🐕 Dogs'))
  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(mockFetch).toHaveBeenLastCalledWith(
    'http://test-ai-url/generateEmoji',
    expect.objectContaining({
      body: JSON.stringify({ values: ['Dogs'] }),
    }),
  )
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🦊 Dogs`)
})

it('restores the source value when inference returns an error', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Model unavailable' }),
    status: 500,
  })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog`)
  expect(store.getState().error).toBe('Model unavailable')
})

it('does not overwrite an edit made while inference is pending', async () => {
  acknowledgeAiDisclosure()
  /** Resolves the pending AI request so the test controls when generation completes. */
  let resolveAiRequest: (response: { json: () => Promise<{ emojis: string[][] }> }) => void = () => {}
  mockFetch.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveAiRequest = resolve
      }),
  )
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(generateEmoji)
  await dispatch(editThoughtByContext(['Dog...'], 'Dogs'))
  await act(async () => {
    resolveAiRequest({ json: () => Promise.resolve({ emojis: [emojis] }) })
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dogs`)
})

it('shows the AI disclosure before changing the thought or sending a request', async () => {
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog`)
})

it('continues the current request after allowing AI once', async () => {
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])
  executeCommand(generateEmoji)

  const continuation = acceptAiDisclosure({ remember: false })
  await act(async () => {
    continuation?.()
  })

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🐕 Dog`)
})

it.each([false, true])('preserves edit mode when isKeyboardOpen is %s', async isKeyboardOpen => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog']), keyboardOpen({ value: isKeyboardOpen })])

  await act(async () => {
    executeCommand(generateEmoji)
  })

  expect(store.getState().isKeyboardOpen).toBe(isKeyboardOpen)
})

it('adjusts the caret by the generated prefix length while cycling variable-length emoji', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])
  await dispatch(setCursorPath({ path: store.getState().cursor!, offset: 2 }))

  await act(async () => {
    executeCommand(generateEmoji)
  })
  expect(store.getState().cursorOffset).toBe(5)

  await act(async () => {
    executeCommand(generateEmoji)
  })
  expect(store.getState().cursorOffset).toBe(8)
})

const bookEmojis = ['📚', '📖', '📘', '📕', '📗', '📙', '📓', '📔', '📒', '🔖']

it('generates emoji for every selected thought in one request within one undo step', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis, bookEmojis] }) })
  await dispatch([
    importText({
      text: `
        - Dog
        - Books
      `,
    }),
    setCursor(['Dog']),
    addMulticursor(['Dog']),
    addMulticursor(['Books']),
  ])

  await act(async () => {
    executeCommandWithMulticursor(generateEmoji, { store })
    await vi.runAllTimersAsync()
  })

  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/generateEmoji', {
    body: JSON.stringify({ values: ['Dog', 'Books'] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🐕 Dog
  - 📚 Books`)

  await dispatch(undo())
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog
  - Books`)
  expect(store.getState().alert?.value).toBe('Undo: Generate Emoji')
})

it('cycles cached alternatives and requests emoji only for the uncached selected thoughts', async () => {
  acknowledgeAiDisclosure()
  mockFetch
    .mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
    .mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [bookEmojis] }) })
  await dispatch([
    importText({
      text: `
        - Dog
        - Books
      `,
    }),
    setCursor(['Dog']),
  ])

  await act(async () => {
    executeCommand(generateEmoji)
  })
  await dispatch([addMulticursor(['🐕 Dog']), addMulticursor(['Books'])])

  await act(async () => {
    executeCommandWithMulticursor(generateEmoji, { store })
    await vi.runAllTimersAsync()
  })

  // Dog cycles to its next cached alternative without a request, so the request contains only Books.
  expect(mockFetch).toHaveBeenCalledTimes(2)
  expect(mockFetch).toHaveBeenLastCalledWith(
    'http://test-ai-url/generateEmoji',
    expect.objectContaining({ body: JSON.stringify({ values: ['Books'] }) }),
  )
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - 🐕‍🦺 Dog
  - 📚 Books`)
})

it('restores every selected thought when the request returns an error', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Model unavailable' }),
    status: 500,
  })
  await dispatch([
    importText({
      text: `
        - Dog
        - Books
      `,
    }),
    setCursor(['Dog']),
    addMulticursor(['Dog']),
    addMulticursor(['Books']),
  ])

  await act(async () => {
    executeCommandWithMulticursor(generateEmoji, { store })
    await vi.runAllTimersAsync()
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog
  - Books`)
  expect(store.getState().error).toBe('Model unavailable')
})

it('restores every selected thought when the response omits a thought', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ emojis: [emojis] }) })
  await dispatch([
    importText({
      text: `
        - Dog
        - Books
      `,
    }),
    setCursor(['Dog']),
    addMulticursor(['Dog']),
    addMulticursor(['Books']),
  ])

  await act(async () => {
    executeCommandWithMulticursor(generateEmoji, { store })
    await vi.runAllTimersAsync()
  })

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog
  - Books`)
  expect(store.getState().error).toBe('Failed to generate emoji')
})
