import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { acceptAiDisclosure, acknowledgeAiDisclosure, clearAiDisclosureAcknowledgement } from '../../util/aiDisclosure'
import defineTerm from '../defineTerm'

const definition = 'A domesticated canine mammal commonly kept for companionship, work, protection, or sport.'
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

it('displays the generated dictionary entry in an alert', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().alert?.value).toBe(definition))
  })

  expect(mockFetch).toHaveBeenCalledWith('http://test-ai-url/defineTerm', {
    body: JSON.stringify({ term: 'Dog' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Dog`)
})

it('shows the AI disclosure before sending the term', async () => {
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(defineTerm)

  expect(store.getState().showModal).toBe('aiDisclosure')
  expect(mockFetch).not.toHaveBeenCalled()
})

it('continues the current request after allowing AI once', async () => {
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])
  executeCommand(defineTerm)

  const continuation = acceptAiDisclosure({ remember: false })
  continuation?.()
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().alert?.value).toBe(definition))
  })

  expect(mockFetch).toHaveBeenCalledTimes(1)
})

it('surfaces an AI service error', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Model unavailable' }),
    status: 500,
  })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().error).toBe('Model unavailable'))
  })
})

it('asks the user to retry after reaching the rate limit', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ error: 'Rate limit reached' }),
    status: 429,
  })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().alert?.value).toBe('Rate limit reached. Please try again later.'))
  })
})

it('reports an invalid AI response', async () => {
  acknowledgeAiDisclosure()
  mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ definition: '' }) })
  await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

  executeCommand(defineTerm)
  await act(async () => {
    await vi.waitFor(() => expect(store.getState().error).toBe('Failed to define term'))
  })
})

it('is disabled without a cursor', () => {
  expect(defineTerm.canExecute!(store.getState())).toBe(false)
})
