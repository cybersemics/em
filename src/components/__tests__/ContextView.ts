import { cursorDown, newThought } from '../../action-creators'
import { store } from '../../store'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findAllThoughtsByText } from '../../test-helpers/queries'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'

describe('Extract thought', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('clicking a thought in the context view should not expand matching thoughts', async () => {
    store.dispatch([
      newThought({ value: 'Thought A' }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator(['Thought A']),
      newThought({ value: 'Thought B' }),
      newThought({ value: 'sub-thought', insertNewSubthought: true }),
      setCursorFirstMatchActionCreator(['Thought B', 'sub-thought']),
      { type: 'toggleContextView' },
      cursorDown()
    ])

    const thoughts = await findAllThoughtsByText('sub-thought')
    expect(thoughts.length).toBe(1)

  })
})
