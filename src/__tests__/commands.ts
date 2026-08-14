import { formatKeyboardShortcut, hashCommand, parseCommandShortcut } from '../commands'

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
    // extractThought is bound to { key: 'e', control: true, meta: true }, i.e. Command + Control + e on Mac and
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
