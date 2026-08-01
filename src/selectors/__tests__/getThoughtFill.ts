import newThought from '../../actions/newThought'
import getThoughtFill from '../../selectors/getThoughtFill'
import head from '../../util/head'
import initialState from '../../util/initialState'

/** Creates a single thought and returns its derived fill color. */
const fillOf = (value: string) => {
  const state = newThought(initialState(), { value })
  return getThoughtFill(state, head(state.cursor!))
}

describe('getThoughtFill', () => {
  it('gets the fill from a fully colored thought', () => {
    expect(fillOf('<font color="#ff573d">hello</font>')).toBe('#ff573d')
  })

  it('gets the fill from adjacent same-color formatting tags', () => {
    expect(fillOf('<font color="#ff573d">b</font><font color="#ff573d">a</font>')).toBe('#ff573d')
  })

  it('gets the background fill from adjacent same-background formatting tags', () => {
    expect(
      fillOf(
        '<font color="#000000" style="background-color: rgb(255, 87, 61);">b</font><font color="#000000" style="background-color: rgb(255, 87, 61);">a</font>',
      ),
    ).toBe('rgb(255, 87, 61)')
  })

  it('ignores uncolored whitespace around fully colored text', () => {
    expect(fillOf(' <font color="#ff573d">hello</font> ')).toBe('#ff573d')
  })

  it('does not return a fill for partially colored text', () => {
    expect(fillOf('hello <font color="#ff573d">world</font>')).toBeUndefined()
  })

  it('does not return a fill for mixed colors', () => {
    expect(fillOf('<font color="#ff573d">hello</font><font color="#00d688">world</font>')).toBeUndefined()
  })
})
