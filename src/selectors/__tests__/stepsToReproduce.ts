import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import moveThoughtDownCommand from '../../commands/moveThoughtDown'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import contextToPath from '../contextToPath'
import stepsToReproduce from '../stepsToReproduce'

beforeEach(initStore)

/** Creates a, b, and c, then indents c and then b. */
const createAndIndent = () =>
  store.dispatch([
    newThought({}),
    editThought([''], 'a'),
    newThought({}),
    editThought([''], 'b'),
    newThought({}),
    editThought([''], 'c'),
    indent(),
    setCursor(['b']),
    indent(),
  ])

it('export the thoughtspace at the start and describe each step up to the end', () => {
  createAndIndent()

  // start after b was created, end after c was indented
  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(`\`\`\`
- a
- b
\`\`\`

1. Create thought \`c\` after \`b\`.
2. Indent \`c\`.`)
})

it('describe the same steps when the current state is between the start and the end', () => {
  createAndIndent()
  store.dispatch([undo(), undo()])

  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(`\`\`\`
- a
- b
\`\`\`

1. Create thought \`c\` after \`b\`.
2. Indent \`c\`.`)
})

it('export only the thoughtspace when the start and the end coincide', () => {
  createAndIndent()

  expect(stepsToReproduce(store.getState(), { start: 0, end: 0 })).toBe(`\`\`\`
- a
  - b
    - c
\`\`\``)
})

it('describe a new thought, an edit, a deletion, and a move', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
    setCursor(['a']),
    newThought({ value: 'd', insertNewSubthought: true }),
    setCursor(['b']),
    editThought(['b'], 'bb'),
    setCursor(['c']),
    deleteThoughtWithCursor(),
    setCursor(['a']),
    moveThoughtDown(),
  ])

  expect(stepsToReproduce(store.getState(), { start: 5, end: 0 })).toBe(`\`\`\`
- a
- b
- c
\`\`\`

1. Create thought \`d\` as a subthought of \`a\`.
2. Edit \`b\` to \`bb\`.
3. Delete \`c\`.
4. Move \`a\` down.`)
})

it('describe a multicursor command by its label and the selected thoughts', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
        - d
      `,
    }),
    setCursor(['a']),
    addMulticursor(['a']),
    addMulticursor(['b']),
  ])
  executeCommandWithMulticursor(moveThoughtDownCommand, { store })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`\`\`\`
- a
- b
- c
- d
\`\`\`

1. Move Thought Down \`a\`, \`b\`.`)
})

it('fall back to the name of the action and the cursor thought', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) =>
      dispatch(toggleAttribute({ path: contextToPath(getState(), ['a']), values: ['=pin', 'true'] })),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`\`\`\`
- a
\`\`\`

1. Toggle Attribute \`a\`.`)
})

it('quote a multiline paste in a code block', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) =>
      dispatch(
        importText({
          path: contextToPath(getState(), ['a'])!,
          text: `- b
  - c`,
        }),
      ),
  ])

  expect(stepsToReproduce(store.getState(), { start: 2, end: 0 })).toBe(`\`\`\`
- a
\`\`\`

1. Paste into \`a\`:

   \`\`\`
   - b
     - c
   \`\`\``)
})
