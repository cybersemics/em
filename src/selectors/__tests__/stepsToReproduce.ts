import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { swapParentActionCreator as swapParent } from '../../actions/swapParent'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import deleteEmptyThoughtOrOutdentCommand from '../../commands/deleteEmptyThoughtOrOutdent'
import moveThoughtDownCommand from '../../commands/moveThoughtDown'
import toggleSortCommand from '../../commands/toggleSort'
import { HOME_PATH } from '../../constants'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import contextToPath from '../contextToPath'
import stepsToReproduce from '../stepsToReproduce'

beforeEach(initStore)

/** The expected report for the given thoughtspace at the start, numbered steps, and thoughtspace at the end. */
const report = (start: string, steps: string, end: string) => `## Steps to Reproduce


\`\`\`
${start}
\`\`\`


${steps}


## Current Behavior


\`\`\`
${end}
\`\`\`


## Expected Behavior

`

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

it('report the thoughtspace at the start, the steps up to the end, and the thoughtspace at the end', () => {
  createAndIndent()

  // start after b was created, end after c was indented
  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(`## Steps to Reproduce


\`\`\`
- a
- b
\`\`\`


1. Set the cursor on \`b\`.
2. Create thought \`c\`.
3. Indent.


## Current Behavior


\`\`\`
- a
- b
  - c
\`\`\`


## Expected Behavior

`)
})

it('describe the same steps when the current state is between the start and the end', () => {
  createAndIndent()
  store.dispatch([undo(), undo()])

  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(
    report(
      `- a
- b`,
      `1. Set the cursor on \`b\`.
2. Create thought \`c\`.
3. Indent.`,
      `- a
- b
  - c`,
    ),
  )
})

it('omit the steps when the start and the end coincide', () => {
  createAndIndent()

  expect(stepsToReproduce(store.getState(), { start: 0, end: 0 })).toBe(`## Steps to Reproduce


\`\`\`
- a
  - b
    - c
\`\`\`


## Current Behavior


\`\`\`
- a
  - b
    - c
\`\`\`


## Expected Behavior

`)
})

it('name each action as dispatched, preceded by the cursor it acts on', () => {
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

  expect(stepsToReproduce(store.getState(), { start: 5, end: 0 })).toBe(
    report(
      `- a
- b
- c`,
      `1. Set the cursor on \`a\`.
2. Create thought \`d\` as a subthought of \`a\`.
3. Set the cursor on \`b\`.
4. Edit \`b\` to \`bb\`.
5. Set the cursor on \`c\`.
6. Delete Thought With Cursor.
7. Set the cursor on \`a\`.
8. Move Thought Down.`,
      `- bb
- a
  - d`,
    ),
  )
})

it('name a multicursor command by its label, preceded by the selection it acts on', () => {
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a
- b
- c
- d`,
      `1. Set the cursor on \`a\`.
2. Select \`a\` and \`b\`.
3. Move Thought Down.`,
      `- c
- a
- b
- d`,
    ),
  )
})

it('describe a toggled attribute by its path', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) =>
      dispatch(toggleAttribute({ path: contextToPath(getState(), ['a']), values: ['=sort', 'Alphabetical'] })),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a`,
      `1. Set the cursor on \`a\`.
2. Toggle Attribute \`=sort/Alphabetical\`.`,
      `- a
  - =sort
    - Alphabetical`,
    ),
  )
})

it('name the root when an attribute is set on it', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    toggleAttribute({ path: HOME_PATH, values: ['=view', 'Table'] }),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a`,
      `1. Set the cursor on \`a\`.
2. Toggle Attribute \`=view/Table\` on the root.`,
      `- =view
  - Table
- a`,
    ),
  )
})

it('describe meta attributes that are set, changed, and removed', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) =>
      dispatch({ type: 'setDescendant', path: contextToPath(getState(), ['a']), values: ['=view', 'Table'] }),
  ])
  executeCommandWithMulticursor(toggleSortCommand, { store })
  executeCommandWithMulticursor(toggleSortCommand, { store })
  store.dispatch((dispatch, getState) =>
    dispatch({ type: 'deleteAttribute', path: contextToPath(getState(), ['a']), value: '=view' }),
  )

  expect(stepsToReproduce(store.getState(), { start: 4, end: 0 })).toBe(
    report(
      `- a
  - b`,
      `1. Set the cursor on \`a\`.
2. Set Descendant \`=view/Table\`.
3. Toggle Sort (sets \`=sort/Alphabetical/Asc\`).
4. Toggle Sort (sets \`=sort/Alphabetical/Desc\`).
5. Delete Attribute \`=view/Table\`.`,
      // toggleSort sorts the context of the cursor
      `- a
  - b
- =sort
  - Alphabetical
    - Desc`,
    ),
  )
})

it('fall back to the name of the action', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
      `,
    }),
    setCursor(['a', 'b']),
    swapParent(),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a
  - b`,
      `1. Set the cursor on \`b\`.
2. Swap Parent.`,
      `- b
  - a`,
    ),
  )
})

it('name a formatting edit after the formatting it applies', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    editThought(['a'], '<b>a</b>'),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a`,
      `1. Set the cursor on \`a\`.
2. Bold.`,
      `- **a**`,
    ),
  )
})

it('name an empty thought as the empty thought', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['b']),
    editThought(['b'], ''),
    editThought([''], 'g'),
  ])

  expect(stepsToReproduce(store.getState(), { start: 2, end: 0 })).toBe(
    report(
      `- a
- b`,
      `1. Set the cursor on \`b\`.
2. Edit \`b\` to the empty thought.
3. Edit the empty thought to \`g\`.`,
      `- a
- g`,
    ),
  )
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a`,
      `1. Set the cursor on \`a\`.
2. Paste:

   \`\`\`
   - b
     - c
   \`\`\``,
      `- a
  - b
    - c`,
    ),
  )
})

it('describe a single-line paste by the pasted text', () => {
  store.dispatch([
    importText({
      text: `
        - a
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) => dispatch(importText({ path: contextToPath(getState(), ['a'])!, text: 'xyz' })),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a`,
      `1. Set the cursor on \`a\`.
2. Paste \`xyz\`.`,
      `- xyza`,
    ),
  )
})

it('describe a drag and drop by where the thought lands', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
          - d
        - e
          - f
      `,
    }),
    setCursor(['a']),
    (dispatch, getState) => {
      const oldPath = contextToPath(getState(), ['e', 'f'])!
      dispatch({
        type: 'moveThought',
        oldPath,
        newPath: [...contextToPath(getState(), ['a'])!, oldPath.at(-1)!],
        newRank: 0.5,
      })
    },
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a
  - b
  - d
- e
  - f`,
      `1. Set the cursor on \`a\`.
2. Move Thought \`f\` after \`b\`.`,
      `- a
  - b
  - f
  - d
- e`,
    ),
  )
})

it('describe the deletion of an empty thought', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
          - ${''}
      `,
    }),
    setCursor(['a', '']),
  ])
  executeCommandWithMulticursor(deleteEmptyThoughtOrOutdentCommand, { store })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- a
  - b
  - ${''}`,
      `1. Set the cursor on the empty thought.
2. Delete Empty Thought.`,
      `- a
  - b`,
    ),
  )
})

it('describe an extracted subthought by the extracted text', () => {
  store.dispatch([
    importText({
      text: `
        - hello big world
      `,
    }),
    setCursor(['hello big world']),
    { type: 'extractSubthought', selectionStart: 6, selectionEnd: 9 },
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(
    report(
      `- hello big world`,
      `1. Set the cursor on \`hello big world\`.
2. Extract Subthought \`big\`.`,
      `- hello  world
  - big`,
    ),
  )
})
