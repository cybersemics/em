import { hashCommand, parseCommandShortcut } from '../commands'

describe('parseCommandShortcut', () => {
  it('parses a space-separated shortcut', () => {
    expect(parseCommandShortcut('cmd option k')).toBe('META_ALT_K')
  })

  it('is order-independent', () => {
    expect(parseCommandShortcut('option cmd k')).toBe('META_ALT_K')
  })

  it('is case-insensitive', () => {
    expect(parseCommandShortcut('Cmd Option K')).toBe('META_ALT_K')
  })

  it('accepts "meta" as a Command/Control synonym', () => {
    expect(parseCommandShortcut('meta option k')).toBe('META_ALT_K')
  })

  it('accepts "+" as a separator', () => {
    expect(parseCommandShortcut('cmd+option+k')).toBe('META_ALT_K')
  })

  it('accepts "+" with surrounding spaces as a separator', () => {
    expect(parseCommandShortcut('cmd + option + k')).toBe('META_ALT_K')
  })

  it('treats all Command/Control synonyms (cmd, command, meta, ctrl, control) as META', () => {
    expect(parseCommandShortcut('cmd option k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('command option k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('meta option k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('ctrl option k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('control option k')).toBe('META_ALT_K')
  })

  it('treats all Option/Alt synonyms as ALT', () => {
    expect(parseCommandShortcut('cmd opt k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('cmd option k')).toBe('META_ALT_K')
    expect(parseCommandShortcut('cmd alt k')).toBe('META_ALT_K')
  })

  it('parses the shift modifier', () => {
    expect(parseCommandShortcut('cmd shift h')).toBe('META_SHIFT_H')
    expect(parseCommandShortcut('shift alt s')).toBe('ALT_SHIFT_S')
  })

  it('emits modifiers in META_ ALT_ SHIFT_ order regardless of input order', () => {
    expect(parseCommandShortcut('shift option cmd k')).toBe('META_ALT_SHIFT_K')
  })

  it('parses named keys', () => {
    expect(parseCommandShortcut('cmd enter')).toBe('META_ENTER')
    expect(parseCommandShortcut('cmd return')).toBe('META_ENTER')
    expect(parseCommandShortcut('cmd escape')).toBe('META_ESCAPE')
    expect(parseCommandShortcut('cmd esc')).toBe('META_ESCAPE')
    expect(parseCommandShortcut('cmd backspace')).toBe('META_BACKSPACE')
    expect(parseCommandShortcut('cmd up')).toBe('META_ARROWUP')
    expect(parseCommandShortcut('cmd down')).toBe('META_ARROWDOWN')
  })

  it('parses digit keys', () => {
    expect(parseCommandShortcut('cmd 1')).toBe('META_1')
  })

  it('matches the hash produced by hashCommand for the same shortcut', () => {
    expect(parseCommandShortcut('cmd option k')).toBe(hashCommand({ key: 'k', meta: true, alt: true }))
    expect(parseCommandShortcut('cmd shift h')).toBe(hashCommand({ key: 'h', meta: true, shift: true }))
    expect(parseCommandShortcut('cmd enter')).toBe(hashCommand({ key: 'Enter', meta: true }))
  })

  it('finds extractThought via any Command/Control synonym (control is folded into meta)', () => {
    // extractThought is bound to { key: 'e', control: true, meta: true }, which hashCommand normalizes to META_E
    const extractHash = hashCommand({ key: 'e', control: true, meta: true })
    expect(extractHash).toBe('META_E')
    expect(parseCommandShortcut('ctrl e')).toBe(extractHash)
    expect(parseCommandShortcut('control e')).toBe(extractHash)
    expect(parseCommandShortcut('cmd e')).toBe(extractHash)
    expect(parseCommandShortcut('meta e')).toBe(extractHash)
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
