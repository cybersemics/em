import { fireEvent } from '@testing-library/dom'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import defineTerm from '../../commands/defineTerm'
import generateEmoji from '../../commands/generateEmoji'
import generateThought from '../../commands/generateThought'
import organizeThought from '../../commands/organizeThought'
import { HOME_TOKEN } from '../../constants'
import * as selection from '../../device/selection'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursorAtFirstMatch } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../test-helpers/windowEvent'
import { acknowledgeAiDisclosure, clearAiDisclosureAcknowledgement } from '../../util/aiDisclosure'
import Editable from '../Editable'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// Using a clipboard app such as Paste for iOS or the built-in clipboard viewer on Android directly modifies the innerHTML and triggers an onChange event on the contenteditable.
it('"paste" from clipboard app into empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  // The clipboard app replaces plaintext newlines with divs.
  editable.innerHTML = '- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - c`)
})

it('"paste" from clipboard app into non-empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  const user = userEvent.setup({ delay: null })
  await user.type(editable, 'test')
  await act(vi.runAllTimersAsync)

  // The clipboard app appends the text to the existing content.
  editable.innerHTML = 'test- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - test
    - a
      - b
        - c`)
})

it('inserts emoji spacing immediately and allows Backspace at the emoji boundary', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  editable.innerHTML = '🧠Hello'
  fireEvent.input(editable, { bubbles: true })
  expect(editable.textContent).toBe('🧠 Hello')

  const user = userEvent.setup({ delay: null })
  editable.focus()
  selection.set(editable, { offset: '🧠 '.length })
  await user.keyboard('{Backspace}')
  await act(vi.runAllTimersAsync)

  expect(editable.textContent).toBe('🧠Hello')
})

it.each<{ cursor: string[] | null; cursorName: string }>([
  { cursor: null, cursorName: 'null' },
  { cursor: ['A'], cursorName: 'parent' },
])('preserves a $cursorName cursor after a trailing click from a thought that has moved', async ({ cursor }) => {
  await dispatch(
    importText({
      text: `
        - A
          - B
          - C
          - D
      `,
    }),
  )
  await dispatch(setCursor(cursor))
  await act(vi.runOnlyPendingTimersAsync)

  const stalePath = contextToPath(store.getState(), ['A', 'B']) as SimplePath
  const cursorBefore = store.getState().cursor
  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(Editable, {
        isEditing: false,
        isVisible: true,
        path: stalePath,
        rank: 0,
        simplePath: stalePath,
      }),
    }),
  )
  const staleEditable = container.querySelector('[data-editable]')!

  await dispatch(
    moveThought({
      from: ['A', 'B'],
      to: ['A', 'C', 'B'],
      newRank: 0,
    }),
  )
  await act(() => fireEvent.click(staleEditable))

  expect(store.getState().cursor).toEqual(cursorBefore)
  await act(vi.runOnlyPendingTimersAsync)
})

it('inserts emoji spacing immediately before colored text', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  editable.innerHTML = '👋<font color="#ff0000">Hello</font>'
  act(() => {
    fireEvent.input(editable, { bubbles: true })
  })

  expect(editable.textContent).toBe('👋 Hello')
  expect(editable.innerHTML).toBe('👋 <font color="#ff0000">Hello</font>')
})

// A press that is longer than a quick tap but shorter than a long press ("mid press") gets its synthesized click
// from the browser even though the touchend called preventDefault, which used to toggle the multicursor a second
// time so that the selection flashed on and off again.
it('toggles the multicursor once when a mid press dispatches both touchend and a synthesized click', async () => {
  await dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    addMulticursorAtFirstMatch(['a']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  const editable = (await findThoughtByText('b'))!

  act(() => {
    fireEvent.touchEnd(editable)
    fireEvent.click(editable)
  })

  expect(Object.keys(store.getState().multicursors)).toHaveLength(2)
})

// A tap whose touchend does not reach the tap handler (e.g. its editable was re-rendered mid-tap) is carried by its
// synthesized click alone. The touchstart clears the previous tap's touchend time so that this click is not mistaken
// for the previous tap's synthesized click and dropped, which would lose the second tap of a fast double tap.
it('toggles the multicursor on a click that follows a new touchstart', async () => {
  await dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    addMulticursorAtFirstMatch(['a']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  const editable = (await findThoughtByText('b'))!

  act(() => {
    fireEvent.touchStart(editable)
    fireEvent.touchEnd(editable)
    fireEvent.touchStart(editable)
    fireEvent.click(editable)
  })

  // the first tap selected b, the second deselected it
  expect(Object.keys(store.getState().multicursors)).toHaveLength(1)
})

describe('Generate Thought', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
    clearAiDisclosureAcknowledgement()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('shows Generating Thought as the placeholder of an empty thought while Generate Thought is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- ' }), setCursor([''])])

    await act(async () => {
      executeCommand(generateThought)
    })

    const editable = document.querySelector('[placeholder="Generating Thought"]')
    expect(editable).not.toBeNull()
    expect(editable).toHaveAttribute('data-generating')
  })

  it('keeps the current text of a non-empty thought while Generate Thought is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- a' }), setCursor(['a'])])

    await act(async () => {
      executeCommand(generateThought)
    })

    const editable = (await findThoughtByText('a'))!
    expect(editable).toHaveAttribute('data-generating')
    expect(editable.textContent).toBe('a')
    expect(document.querySelector('[placeholder="Generating Thought"]')).toBeNull()
  })

  it('clears the generating marker when Generate Thought completes', async () => {
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

    await dispatch([importText({ text: '- a' }), setCursor(['a'])])

    await act(async () => {
      executeCommand(generateThought)
    })

    const pending = (await findThoughtByText('a'))!
    expect(pending).toHaveAttribute('data-generating')

    await act(async () => {
      resolveAiRequest({ json: () => Promise.resolve({ thoughts: ['generated'] }) })
    })

    const editable = (await findThoughtByText('generated'))!
    expect(editable).not.toHaveAttribute('data-generating')
    expect(document.querySelector('[placeholder="Generating Thought"]')).toBeNull()
  })
})

describe('Organize Thoughts', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
    clearAiDisclosureAcknowledgement()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('shows Reorganizing Thought as the placeholder of an empty thought while Organize Thoughts is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- ' }), setCursor([''])])

    await act(async () => {
      executeCommand(organizeThought)
    })

    const editable = document.querySelector('[placeholder="Reorganizing Thought"]')
    expect(editable).not.toBeNull()
    expect(editable).toHaveAttribute('data-generating')
  })

  it('keeps the current text of a non-empty thought while Organize Thoughts is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

    await act(async () => {
      executeCommand(organizeThought)
    })

    const editable = (await findThoughtByText('apples'))!
    expect(editable).toHaveAttribute('data-generating')
    expect(editable.textContent).toBe('apples')
    expect(document.querySelector('[placeholder="Reorganizing Thought"]')).toBeNull()
  })

  it('keeps existing text and shows Reorganizing Thought on empty thoughts in the same selection', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([
      importText({ text: '- \n- potato' }),
      setCursor(['']),
      addMulticursorAtFirstMatch(['']),
      addMulticursorAtFirstMatch(['potato']),
    ])

    await act(async () => {
      executeCommandWithMulticursor(organizeThought, { store })
      await vi.runAllTimersAsync()
    })

    const empty = document.querySelector('[placeholder="Reorganizing Thought"]')
    expect(empty).not.toBeNull()
    expect(empty).toHaveAttribute('data-generating')

    const potato = (await findThoughtByText('potato'))!
    expect(potato).toHaveAttribute('data-generating')
    expect(potato.textContent).toBe('potato')
  })

  it('clears the generating marker when Organize Thoughts completes', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    /** Resolves the pending AI request. Assigned when the mocked fetch is called, so the test controls exactly when the reorganization completes. */
    let resolveAiRequest: (response: { json: () => Promise<{ outline: unknown }> }) => void = () => {}
    mockFetch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveAiRequest = resolve
        }),
    )

    await dispatch([importText({ text: '- apples' }), setCursor(['apples'])])

    await act(async () => {
      executeCommand(organizeThought)
    })

    const pending = (await findThoughtByText('apples'))!
    expect(pending).toHaveAttribute('data-generating')

    await act(async () => {
      resolveAiRequest({ json: () => Promise.resolve({ outline: [{ id: '1', text: null, children: [] }] }) })
    })

    const editable = (await findThoughtByText('apples'))!
    expect(editable).not.toHaveAttribute('data-generating')
    expect(document.querySelector('[placeholder="Reorganizing Thought"]')).toBeNull()
  })
})

describe('Define Term', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
    clearAiDisclosureAcknowledgement()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('keeps the current text of a thought while Define Term is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

    await act(async () => {
      executeCommand(defineTerm)
    })

    const editable = (await findThoughtByText('apple'))!
    expect(editable).toHaveAttribute('data-generating')
    expect(editable.textContent).toBe('apple')
  })

  it('clears the generating marker when Define Term completes', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    /** Resolves the pending AI request. Assigned when the mocked fetch is called, so the test controls exactly when the definition completes. */
    let resolveAiRequest: (response: { json: () => Promise<{ definitions: string[] }> }) => void = () => {}
    mockFetch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveAiRequest = resolve
        }),
    )

    await dispatch([importText({ text: '- apple' }), setCursor(['apple'])])

    await act(async () => {
      executeCommand(defineTerm)
    })

    const pending = (await findThoughtByText('apple'))!
    expect(pending).toHaveAttribute('data-generating')

    await act(async () => {
      resolveAiRequest({
        json: () => Promise.resolve({ definitions: ['A round, edible fruit with crisp flesh that grows on trees.'] }),
      })
    })

    const editable = (await findThoughtByText('apple'))!
    expect(editable).not.toHaveAttribute('data-generating')
  })
})

describe('Generate Emoji', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
    clearAiDisclosureAcknowledgement()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('shows Generating Emoji as the placeholder of an empty thought while Generate Emoji is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- ' }), setCursor([''])])

    await act(async () => {
      executeCommand(generateEmoji)
    })

    const editable = document.querySelector('[placeholder="Generating Emoji"]')
    expect(editable).not.toBeNull()
    expect(editable).toHaveAttribute('data-generating')
  })

  it('keeps the current text of a non-empty thought while Generate Emoji is in flight', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

    await act(async () => {
      executeCommand(generateEmoji)
    })

    const editable = (await findThoughtByText('Dog'))!
    expect(editable).toHaveAttribute('data-generating')
    expect(editable.textContent).toBe('Dog')
    expect(document.querySelector('[placeholder="Generating Emoji"]')).toBeNull()
  })

  it('clears the generating marker when Generate Emoji completes', async () => {
    vi.stubEnv('VITE_AI_URL', 'http://test-ai-url')
    acknowledgeAiDisclosure()

    /** Resolves the pending AI request. Assigned when the mocked fetch is called, so the test controls exactly when the emoji land. */
    let resolveAiRequest: (response: { json: () => Promise<{ emojis: string[][] }> }) => void = () => {}
    mockFetch.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveAiRequest = resolve
        }),
    )

    await dispatch([importText({ text: '- Dog' }), setCursor(['Dog'])])

    await act(async () => {
      executeCommand(generateEmoji)
    })

    const pending = (await findThoughtByText('Dog'))!
    expect(pending).toHaveAttribute('data-generating')

    await act(async () => {
      resolveAiRequest({
        json: () =>
          Promise.resolve({
            emojis: [['🐕', '🐕‍🦺', '🦮', '🐾', '🦴', '🐶', '🐩', '🐺', '🏠', '🦊']],
          }),
      })
    })

    const editable = (await findThoughtByText('🐕 Dog'))!
    expect(editable).not.toHaveAttribute('data-generating')
    expect(document.querySelector('[placeholder="Generating Emoji"]')).toBeNull()
  })
})
