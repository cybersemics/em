import { importTextActionCreator as importText } from '../../actions/importText'
import store from '../../stores/app'
import { deleteThoughtAtFirstMatchActionCreator as deleteThought } from '../../test-helpers/deleteThoughtAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pathToContext from '../../util/pathToContext'
import recentlyEdited from '../recentlyEdited'

beforeEach(initStore)

it('default', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
        - d
          - e
            - f
      `,
    }),
    setCursor(['a', 'b', 'c']),
    editThought(['a', 'b', 'c'], 'cc'),
    setCursor(['d', 'e', 'f']),
    editThought(['d', 'e', 'f'], 'ff'),
  ])

  const state = store.getState()
  const contexts = recentlyEdited(state).map(path => pathToContext(state, path))
  expect(contexts).toEqual([
    ['d', 'e', 'ff'],
    ['a', 'b', 'cc'],
    // first jump point from initial import
    ['d'],
  ])
})

it('filter out deleted thoughts', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
        - d
          - e
            - f
      `,
    }),
    setCursor(['a', 'b', 'c']),
    editThought(['a', 'b', 'c'], 'cc'),
    setCursor(['d', 'e', 'f']),
    editThought(['d', 'e', 'f'], 'ff'),
    deleteThought(['d']),
  ])

  const state = store.getState()
  const contexts = recentlyEdited(state).map(path => pathToContext(state, path))
  expect(contexts).toEqual([['a', 'b', 'cc']])
})

it('filter out adjacent ancestors', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
      `,
    }),
    setCursor(['a', 'b', 'c']),
    editThought(['a', 'b', 'c'], 'cc'),
  ])

  const state = store.getState()
  const contexts = recentlyEdited(state).map(path => pathToContext(state, path))
  expect(contexts).toEqual([['a', 'b', 'cc']])
})
