import { archiveThoughtActionCreator as archiveThought } from '../../actions/archiveThought'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { importTextActionCreator as importText } from '../../actions/importText'
import { indentActionCreator as indent } from '../../actions/indent'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { swapParentActionCreator as swapParent } from '../../actions/swapParent'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import deleteEmptyThoughtOrOutdentCommand from '../../commands/deleteEmptyThoughtOrOutdent'
import moveThoughtDownCommand from '../../commands/moveThoughtDown'
import newSubthoughtTopCommand from '../../commands/newSubthoughtTop'
import newThoughtAboveCommand from '../../commands/newThoughtAbove'
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

it('report the thoughtspace at the start, the steps up to the end, and the thoughtspace at the end', () => {
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

  // start after b was created, end after c was indented
  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`b\`.
2. New Thought \`c\`.
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
    undo(),
    undo(),
  ])

  expect(stepsToReproduce(store.getState(), { start: 3, end: 1 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`b\`.
2. New Thought \`c\`.
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

it('omit the steps when the start and the end coincide', () => {
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

  expect(stepsToReproduce(store.getState(), { start: 5, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
- c
\`\`\`

1. Set the cursor on \`a\`.
2. New Subthought \`d\`.
3. Set the cursor on \`b\`.
4. Edit \`b\` to \`bb\`.
5. Set the cursor on \`c\`.
6. Delete Thought With Cursor.
7. Set the cursor on \`a\`.
8. Move Thought Down.

## Current Behavior

\`\`\`
- bb
- a
  - d
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
- c
- d
\`\`\`

1. Set the cursor on \`a\`.
2. Select \`a\` and \`b\`.
3. Press \`Ctrl + Shift + ↓\`. Move Thought \`b\` after \`a\`.

## Current Behavior

\`\`\`
- c
- a
- b
- d
\`\`\`

## Expected Behavior


`)
})

it.each([
  ['toolbar', 'Tap the Move Thought Down button.'],
  ['gesture', 'Swipe `dud`.'],
  ['commandCenter', 'Tap Move Thought Down in the Command Center.'],
  ['desktopCommandUniverse', 'Choose Move Thought Down in the Command Universe.'],
] as const)('describe the %s input method of a command', (type, sentence) => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a'])])

  executeCommandWithMulticursor(moveThoughtDownCommand, { store, type })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toContain(sentence)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
\`\`\`

1. Set the cursor on \`a\`.
2. Toggle Attribute \`=sort/Alphabetical\`.

## Current Behavior

\`\`\`
- a
  - =sort
    - Alphabetical
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
\`\`\`

1. Set the cursor on \`a\`.
2. Toggle Attribute \`=view/Table\` on the root.

## Current Behavior

\`\`\`
- =view
  - Table
- a
\`\`\`

## Expected Behavior


`)
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

  // toggleSort sorts the context of the cursor, i.e. the root
  expect(stepsToReproduce(store.getState(), { start: 4, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - b
\`\`\`

1. Set the cursor on \`a\`.
2. Set Descendant \`=view/Table\`.
3. Press \`Ctrl + Alt + s\`. This sets \`=sort/Alphabetical/Asc\`.
4. Press \`Ctrl + Alt + s\`. This sets \`=sort/Alphabetical/Desc\`.
5. Delete Attribute \`=view/Table\`.

## Current Behavior

\`\`\`
- a
  - b
- =sort
  - Alphabetical
    - Desc
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - b
\`\`\`

1. Set the cursor on \`b\`.
2. Swap Parent.

## Current Behavior

\`\`\`
- b
  - a
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
\`\`\`

1. Set the cursor on \`a\`.
2. Bold.

## Current Behavior

\`\`\`
- **a**
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 2, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`b\`.
2. Edit \`b\` to the empty thought.
3. Edit the empty thought to \`g\`.

## Current Behavior

\`\`\`
- a
- g
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
\`\`\`

1. Set the cursor on \`a\`.
2. Paste:

   \`\`\`
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
\`\`\`

1. Set the cursor on \`a\`.
2. Paste \`xyz\`.

## Current Behavior

\`\`\`
- xyza
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - b
  - d
- e
  - f
\`\`\`

1. Set the cursor on \`a\`.
2. Move Thought \`f\` after \`b\`.

## Current Behavior

\`\`\`
- a
  - b
  - f
  - d
- e
\`\`\`

## Expected Behavior


`)
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - b
  - ${''}
\`\`\`

1. Set the cursor on the empty thought.
2. Press \`Backspace\`. Delete Thought.

## Current Behavior

\`\`\`
- a
  - b
\`\`\`

## Expected Behavior


`)
})

it('uses keyboardIndex to describe the exact shortcut that invoked a command', () => {
  store.dispatch([importText({ text: '- a\n  - ' }), setCursor(['a', ''])])

  executeCommand(deleteEmptyThoughtOrOutdentCommand, { store, type: 'keyboard', keyboardIndex: 1 })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toContain('Press `Shift + Backspace`.')
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

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- hello big world
\`\`\`

1. Set the cursor on \`hello big world\`.
2. Extract Subthought \`big\`.

## Current Behavior

\`\`\`
- hello  world
  - big
\`\`\`

## Expected Behavior


`)
})

it('clamp positions that are outside the history', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['a']),
    editThought(['a'], 'aa'),
  ])

  // The undo slider keeps its handles as long as the number of patches is unchanged, so a handle can end up past the end of a
  // history that has since been regrouped.
  expect(stepsToReproduce(store.getState(), { start: 99, end: -1 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`a\`.
2. Edit \`a\` to \`aa\`.

## Current Behavior

\`\`\`
- aa
- b
\`\`\`

## Expected Behavior


`)
})

it('do not describe a thought as placed after a hidden meta attribute', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - d
            - e
        - f
      `,
    }),
    setCursor(['a', 'd', 'e']),
    archiveThought({}),
    setCursor(['f']),
    // move f into d, where the only other child is the hidden =archive
    (dispatch, getState) => {
      const oldPath = contextToPath(getState(), ['f'])!
      dispatch({
        type: 'moveThought',
        oldPath,
        newPath: [...contextToPath(getState(), ['a', 'd'])!, oldPath.at(-1)!],
        newRank: 1,
      })
    },
  ])

  expect(stepsToReproduce(store.getState(), { start: 3, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - d
    - e
- f
\`\`\`

1. Set the cursor on \`e\`.
2. Archive Thought.
3. Set the cursor on \`f\`.
4. Move Thought as a subthought of \`d\`.

## Current Behavior

\`\`\`
- a
  - d
    - =archive
      - e
    - f
\`\`\`

## Expected Behavior


`)
})

it('name a thought created inside the cursor a new subthought', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
      `,
    }),
    setCursor(['b']),
    newThought({ insertNewSubthought: true }),
  ])

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`b\`.
2. New Subthought.

## Current Behavior

\`\`\`
- a
- b
  - ${''}
\`\`\`

## Expected Behavior


`)
})

it('place a thought created above the cursor by the cursor', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
    setCursor(['c']),
  ])
  executeCommandWithMulticursor(newThoughtAboveCommand, { store })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
- b
- c
\`\`\`

1. Set the cursor on \`c\`.
2. Press \`Shift + Enter\`. New Thought Above before \`c\`.

## Current Behavior

\`\`\`
- a
- b
- ${''}
- c
\`\`\`

## Expected Behavior


`)
})

it('place a subthought created above the existing subthoughts by the first of them', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - x
          - y
      `,
    }),
    setCursor(['a']),
  ])
  executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toBe(`## Steps to Reproduce

\`\`\`
- a
  - x
  - y
\`\`\`

1. Set the cursor on \`a\`.
2. Press \`Ctrl + Shift + Enter\`. New Subthought Top before \`x\`.

## Current Behavior

\`\`\`
- a
  - ${''}
  - x
  - y
\`\`\`

## Expected Behavior


`)
})

it('omit the thoughtspace when it is empty', () => {
  store.dispatch([newThought({}), editThought([''], 'a'), newThought({}), editThought([''], 'b'), indent()])

  expect(stepsToReproduce(store.getState(), { start: 3, end: 0 })).toBe(`## Steps to Reproduce

1. New Thought \`a\`.
2. New Thought \`b\`.
3. Indent.

## Current Behavior

\`\`\`
- a
  - b
\`\`\`

## Expected Behavior


`)
})
