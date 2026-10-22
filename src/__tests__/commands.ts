import {
  beforeInput,
  formatKeyboardShortcut,
  handleGestureSegment,
  hashCommand,
  hashKeyDown,
  keyDown,
  parseCommandShortcut,
} from '../commands'
import initStore from '../test-helpers/initStore'

describe('parseCommandShortcut', () => {
  it('parses a space-separated shortcut', () => {
    expect(parseCommandShortcut('cmd option k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('is order-independent', () => {
    expect(parseCommandShortcut('option cmd k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('is case-insensitive', () => {
    expect(parseCommandShortcut('Cmd Option K')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('accepts "meta" as a Command/Control synonym', () => {
    expect(parseCommandShortcut('meta option k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('accepts "+" as a separator', () => {
    expect(parseCommandShortcut('cmd+option+k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('accepts "+" with surrounding spaces as a separator', () => {
    expect(parseCommandShortcut('cmd + option + k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
  })

  it('treats all Command synonyms (cmd, command, meta) as META', () => {
    const hash = hashCommand({ key: 'k', meta: true, alt: true })
    expect(parseCommandShortcut('cmd option k')).toBe(hash)
    expect(parseCommandShortcut('command option k')).toBe(hash)
    expect(parseCommandShortcut('meta option k')).toBe(hash)
  })

  it('treats all Option/Alt synonyms as ALT', () => {
    const hash = hashCommand({ key: 'k', meta: true, alt: true })
    expect(parseCommandShortcut('cmd opt k')).toBe(hash)
    expect(parseCommandShortcut('cmd option k')).toBe(hash)
    expect(parseCommandShortcut('cmd alt k')).toBe(hash)
  })

  it('parses the shift modifier', () => {
    expect(parseCommandShortcut('cmd shift h')).toBe(hashCommand({ key: 'h', meta: true, shift: true }))
    expect(parseCommandShortcut('shift alt s')).toBe(hashCommand({ key: 's', alt: true, shift: true }))
  })

  it('parses modifiers regardless of input order', () => {
    expect(parseCommandShortcut('shift option cmd k')).toBe(
      hashCommand({ key: 'k', meta: true, alt: true, shift: true }),
    )
  })

  it('parses named keys', () => {
    expect(parseCommandShortcut('cmd enter')).toBe(hashCommand({ key: 'Enter', meta: true }))
    expect(parseCommandShortcut('cmd return')).toBe(hashCommand({ key: 'Enter', meta: true }))
    expect(parseCommandShortcut('cmd escape')).toBe(hashCommand({ key: 'Escape', meta: true }))
    expect(parseCommandShortcut('cmd esc')).toBe(hashCommand({ key: 'Escape', meta: true }))
    expect(parseCommandShortcut('cmd backspace')).toBe(hashCommand({ key: 'Backspace', meta: true }))
    expect(parseCommandShortcut('cmd up')).toBe(hashCommand({ key: 'ArrowUp', meta: true }))
    expect(parseCommandShortcut('cmd down')).toBe(hashCommand({ key: 'ArrowDown', meta: true }))
  })

  it('parses digit keys', () => {
    expect(parseCommandShortcut('cmd 1')).toBe(hashCommand({ key: '1', meta: true }))
  })

  it('finds a command by typing the shortcut exactly as it is displayed', () => {
    // extractSubthought is bound to { key: 'e', control: true, meta: true }, i.e. Command + Control + e on Mac and
    // Ctrl + Shift + e elsewhere, since Ctrl is already the meta modifier on non-Mac platforms
    const extractKeyboard = { key: 'e', control: true, meta: true }
    expect(parseCommandShortcut(formatKeyboardShortcut(extractKeyboard))).toBe(hashCommand(extractKeyboard))

    // heading1 is bound to { key: '1', meta: true, alt: true, control: true }
    const heading1Keyboard = { key: '1', meta: true, alt: true, control: true }
    expect(parseCommandShortcut(formatKeyboardShortcut(heading1Keyboard))).toBe(hashCommand(heading1Keyboard))
  })

  describe('non-shortcut queries return null', () => {
    it('a single modifier word with no key', () => {
      expect(parseCommandShortcut('command')).toBeNull()
    })

    it('a modifier word followed by a non-key word', () => {
      expect(parseCommandShortcut('command universe')).toBeNull()
      expect(parseCommandShortcut('option universe')).toBeNull()
    })

    it('a bare key with no modifier', () => {
      expect(parseCommandShortcut('k')).toBeNull()
    })

    it('multiple keys with a modifier', () => {
      expect(parseCommandShortcut('cmd k j')).toBeNull()
    })

    it('an empty query', () => {
      expect(parseCommandShortcut('')).toBeNull()
      expect(parseCommandShortcut('   ')).toBeNull()
    })

    it('a plain multi-word label', () => {
      expect(parseCommandShortcut('new thought')).toBeNull()
    })
  })
})

describe('hashKeyDown', () => {
  /** Builds a keydown event, forcing the deprecated keyCode that jsdom otherwise derives from key. */
  const keyDownEvent = (props: KeyboardEventInit & { keyCode: number }): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', props)
    Object.defineProperty(event, 'keyCode', { get: () => props.keyCode })
    return event
  }

  // macOS composes Option + N as a dead key, remapping key and keyCode but not code. Captured from a physical
  // keypress on both browsers. https://github.com/cybersemics/em/issues/5731
  it('resolves an Option chord that macOS composed as a dead key in Chrome, which reports key Dead', () => {
    expect(hashKeyDown(keyDownEvent({ key: 'Dead', code: 'KeyN', keyCode: 192, metaKey: true, altKey: true }))).toBe(
      hashCommand({ key: 'n', meta: true, alt: true }),
    )
  })

  it('resolves an Option chord that macOS composed as a dead key in Safari, which reports key ~', () => {
    expect(hashKeyDown(keyDownEvent({ key: '~', code: 'KeyN', keyCode: 192, metaKey: true, altKey: true }))).toBe(
      hashCommand({ key: 'n', meta: true, alt: true }),
    )
  })

  it('resolves a dead-key Option chord that carries Shift rather than Command', () => {
    expect(hashKeyDown(keyDownEvent({ key: 'Dead', code: 'KeyN', keyCode: 192, altKey: true, shiftKey: true }))).toBe(
      hashCommand({ key: 'n', alt: true, shift: true }),
    )
  })

  it('prefers keyCode over code, so that a layout reporting a letter faithfully is unaffected', () => {
    // AZERTY reports keyCode 65 for the physical KeyQ, which must still hash as A rather than Q.
    expect(hashKeyDown(keyDownEvent({ key: 'a', code: 'KeyQ', keyCode: 65, altKey: true }))).toBe(
      hashCommand({ key: 'a', alt: true }),
    )
  })

  it('ignores code during IME composition, where keyCode is the 229 sentinel and no Option is held', () => {
    expect(hashKeyDown(keyDownEvent({ key: 'Process', code: 'KeyA', keyCode: 229 }))).toBe('PROCESS')
  })

  it('hashes a key that names no letter or digit', () => {
    expect(
      hashKeyDown(keyDownEvent({ key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, metaKey: true, shiftKey: true })),
    ).toBe(hashCommand({ key: 'ArrowDown', meta: true, shift: true }))
  })
})

// Each pair below depends on its order: the first test leaves module state behind in commands.ts, and the second checks
// that it did not reach it. The store is initialized and the fake clock installed once per describe, so no test
// reinstalls the clock and discards what the last one left; the only thing between the two tests is the reset that
// setupTests runs after every test.
// https://github.com/cybersemics/em/issues/5247
describe('isolation between tests', () => {
  afterAll(() => {
    vi.useRealTimers()
  })

  describe('gesture menu timer', () => {
    beforeAll(async () => {
      await initStore()
      // settle what initStore scheduled, so that the only timer counted is the gesture menu
      await vi.runAllTimersAsync()
    })

    it('schedule the gesture menu and end without advancing the clock', () => {
      handleGestureSegment({ gesture: 'r', sequence: 'r' })
      expect(vi.getTimerCount()).toBe(1)
    })

    it('start the next test with no gesture menu pending', () => {
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('key command', () => {
    beforeAll(() => initStore())

    it('press Enter without releasing it', () => {
      keyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    })

    it('do not treat input in the next test as the held Enter', () => {
      const e = new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', cancelable: true })
      beforeInput(e)
      expect(e.defaultPrevented).toBe(false)
    })
  })
})
