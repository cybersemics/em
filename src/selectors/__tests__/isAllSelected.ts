import importText from '../../actions/importText'
import toggleContextView from '../../actions/toggleContextView'
import addMulticursor from '../../test-helpers/addMulticursorAtFirstMatch'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import isAllSelected from '../isAllSelected'

describe('isAllSelected', () => {
  const text = `
    - a
      - m
        - x
        - y
        - z
    - b
      - m
        - t
        - u
        - v
  `

  it('returns true when all contexts at the cursor level are selected in a context view', () => {
    const state = reducerFlow([
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a']),
      addMulticursor(['a', 'm', 'a']),
      addMulticursor(['a', 'm', 'b']),
    ])(initialState())

    expect(isAllSelected(state)).toBe(true)
  })

  it('returns false when only child thoughts are selected in a context view', () => {
    const state = reducerFlow([
      importText({ text }),
      setCursor(['a', 'm']),
      toggleContextView,
      setCursor(['a', 'm', 'a']),
      addMulticursor(['a', 'm', 'a', 'x']),
      addMulticursor(['a', 'm', 'a', 'y']),
      addMulticursor(['a', 'm', 'a', 'z']),
    ])(initialState())

    expect(isAllSelected(state)).toBe(false)
  })
})
