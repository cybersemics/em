import editingValue from '../../action-creators/editingValue'
import newThought from '../../action-creators/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { createTestStore } from '../../test-helpers/createTestStore'

it('Split formatted thought', async () => {
  const store = createTestStore()
  store.dispatch([
    newThought({
      value: '<b>Hello World</b>',
    }),
    editingValue({
      value: '<b>Hello World</b>',
    }),
    newThought({
      splitResult: {
        left: '<b>Hello </b>',
        right: '<b>World</b>',
      },
    }),
  ])

  const stateNew = store.getState()

  const exported = exportContext(stateNew, [HOME_TOKEN])

  expect(exported).toBe(`<ul>
  <li>${HOME_TOKEN}  
    <ul>
      <li><b>Hello </b></li>
      <li><b>World</b></li>
    </ul>
  </li>
</ul>`)
})
