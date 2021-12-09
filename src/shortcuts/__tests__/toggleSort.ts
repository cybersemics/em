import { EM_TOKEN } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute, rankThoughtsFirstMatch } from '../../selectors'
import {
  editThought,
  importText,
  newThought,
  setCursor,
  toggleAttribute,
  setFirstSubthought,
} from '../../action-creators'
import toggleSortShortcut from '../toggleSort'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { SimplePath, Thunk } from '../../@types'
import { store } from '../../store'
import { findThoughtByText } from '../../test-helpers/queries'
import { findAllByPlaceholderText } from '@testing-library/react'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

it('toggle on sort preference of cursor (initial state without =sort attribute)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - d
          - b
          - c
          - e`,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
})

it('toggle sort preference descending of cursor (initial state with =sort/Alphabetical)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =sort
            - Alphabetical
              - Asc
          - d
          - b
          - c
          - e`,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
  expect(attribute(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
})

it('toggle off sort preference of cursor (initial state with =sort/Alphabetical/desc)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =sort
            - Alphabetical
              - Desc
          - d
          - b
          - c
          - e`,
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe(null)
})

it('toggle off sort preference of cursor (initial state with =sort/Alphabetical and Global Sort Alphabetical/desc)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - =sort
            - Alphabetical
              - Asc
          - d
          - b
          - c
          - e`,
    }),

    ((dispatch, getState) =>
      dispatch(
        editThought({
          context: [EM_TOKEN, 'Settings', 'Global Sort'],
          oldValue: 'None',
          newValue: 'Alphabetical',
          path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
        }),
      )) as Thunk,

    ((dispatch, getState) =>
      dispatch(
        setFirstSubthought({
          context: [EM_TOKEN, 'Settings', 'Global Sort', 'Alphabetical'],
          value: 'Desc',
        }),
      )) as Thunk,

    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })
  expect(attribute(store.getState(), ['a'], '=sort')).toBe(null)
})

it('toggle off sort preference of cursor (initial state without =sort attribute and Global Sort Alphabetical/desc)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - a
          - d
          - b
          - c
          - e`,
    }),

    ((dispatch, getState) =>
      dispatch(
        editThought({
          context: [EM_TOKEN, 'Settings', 'Global Sort'],
          oldValue: 'None',
          newValue: 'Alphabetical',
          path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
        }),
      )) as Thunk,

    ((dispatch, getState) =>
      dispatch(
        setFirstSubthought({
          context: [EM_TOKEN, 'Settings', 'Global Sort', 'Alphabetical'],
          value: 'Desc',
        }),
      )) as Thunk,

    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })
  expect(attribute(store.getState(), ['a'], '=sort')).toBe('None')
})

it('toggle on sort preference of home context when cursor is null (initial state without =sort attribute)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - b
          - 1
          - 2
        - a
          - 3
          - 4`,
    }),

    setCursor({ path: null }),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), [], '=sort')).toBe('Alphabetical')
})

it('toggle sort preference descending of home context when cursor is null (initial state with =sort/Alphabetical)', () => {
  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      text: `
        - =sort
          - Alphabetical
        -a
        -b`,
    }),

    setCursor({ path: null }),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), [], '=sort')).toBe('Alphabetical')
  expect(attribute(store.getState(), ['=sort'], 'Alphabetical')).toBe('Desc')
})

it('override global Alphabetical with local Alphabetical/desc', () => {
  const store = createTestStore()

  store.dispatch([
    importText({
      text: `
        - a
          - d
          - b
          - c
          - e
    `,
    }),

    ((dispatch, getState) =>
      dispatch(
        editThought({
          context: [EM_TOKEN, 'Settings', 'Global Sort'],
          oldValue: 'None',
          newValue: 'Alphabetical',
          path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
        }),
      )) as Thunk,

    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
  expect(attribute(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
})

describe('DOM', () => {
  beforeEach(async () => {
    await createTestApp()
  })
  afterEach(cleanupTestApp)

  it('thoughts are sorted alphabetically', async () => {
    store.dispatch([
      newThought({ value: 'c' }),
      newThought({ value: 'a' }),
      newThought({ value: 'b' }),
      setCursor({ path: null }),

      toggleAttribute({
        context: ['__ROOT__'],
        key: '=sort',
        value: 'Alphabetical',
      }),
    ])

    const thought = await findThoughtByText('c')
    expect(thought).toBeTruthy()

    const thoughtsWrapper = thought!.closest('ul') as HTMLElement
    const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

    expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
  })

  it('subthoughts are sorted alphabetically', async () => {
    store.dispatch([
      newThought({ value: 'a' }),
      newThought({ value: '3', insertNewSubthought: true }),
      newThought({ value: '1' }),
      newThought({ value: '2' }),
      setCursorFirstMatchActionCreator(['a']),

      toggleAttribute({
        context: ['a'],
        key: '=sort',
        value: 'Alphabetical',
      }),
    ])

    const thought = await findThoughtByText('a')
    expect(thought).toBeTruthy()

    const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
  })

  describe('sort with Global Sort settings', () => {
    it('thoughts are sorted alphabetically when "Global Sort" settings is Alphabetical', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'b' }),
        newThought({ value: 'a' }),
        setCursor({ path: null }),

        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,
      ])

      const thought = await findThoughtByText('c')
      expect(thought).toBeTruthy()

      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
    })

    it('subthoughts are sorted alphabetically when "Global Sort" settings is Alphabetical', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),
        setCursorFirstMatchActionCreator(['a']),
        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
    })

    it('subthoughts are not sorted alphabetically when context sort is None and "Global Sort" settings is Alphabetical', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),

        setCursorFirstMatchActionCreator(['a']),

        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,

        toggleAttribute({
          context: ['a'],
          key: '=sort',
          value: 'None',
        }),
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '1', '2'])
    })
  })

  describe('descending order', () => {
    it('thoughts are sorted alphabetically in descending order', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'a' }),
        newThought({ value: 'b' }),
        setCursor({ path: null }),
      ])

      store.dispatch([
        toggleAttribute({
          context: ['__ROOT__'],
          key: '=sort',
          value: 'Alphabetical',
        }),
        setFirstSubthought({
          context: ['=sort', 'Alphabetical'],
          value: 'Desc',
        }),
      ])

      const thought = await findThoughtByText('c')
      expect(thought).toBeTruthy()

      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['c', 'b', 'a'])
    })

    it('subthoughts are sorted alphabetically in descending order', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),
        setCursorFirstMatchActionCreator(['a']),
      ])

      store.dispatch([
        toggleAttribute({
          context: ['a'],
          key: '=sort',
          value: 'Alphabetical',
        }),
        setFirstSubthought({
          context: ['a', '=sort', 'Alphabetical'],
          value: 'Desc',
        }),
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '1'])
    })
  })

  describe('empty thought ordering is preserved at the point of creation', () => {
    it('after first thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('a_bcdef')
    })

    it('after middle thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc_def')
    })

    it('after last thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['f']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcdef_')
    })

    it('before first thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_abcdef')
    })

    it('before middle thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('ab_cdef')
    })

    it('before last thought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['f']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcde_f')
    })

    it('multiple empty thoughts', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertBefore: true }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '' }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '' }),
        setCursorFirstMatchActionCreator(['f']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_a_bc_def_')
    })

    it('only one empty subthought', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertNewSubthought: true }),
      ])

      const thought = await findThoughtByText('a')

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')
      const childrenString = thoughtChildren
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_')
    })

    // TODO
    it.skip('multiple contiguous empty thoughts', async () => {
      store.dispatch([
        importText({
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `,
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '' }),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc__def')
    })

    it('except with insertNewSubthought', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =sort
                - Alphabetical
              - d
              - f
              - c
              - b
              - e
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertNewSubthought: true }),
      ])

      const thought = await findThoughtByText('d')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('bcdef_')
    })

    it('except with insertNewSubthought and insertBefore', async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =sort
                - Alphabetical
              - d
              - f
              - c
              - b
              - e
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertNewSubthought: true, insertBefore: true }),
      ])

      const thought = await findThoughtByText('d')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_bcdef')
    })

    it('preserve sort order when thought is edited to empty instead of moving it back to its insertion point', async () => {
      store.dispatch([
        importText({
          text: `
            - test
              - =sort
                - Alphabetical
              - c
              - b
              - a
          `,
        }),
        setCursorFirstMatchActionCreator(['test', 'a']),
        // wrap in a thunk in order to access fresh state
        (dispatch, getState) =>
          dispatch(
            editThought({
              context: ['test'],
              oldValue: 'a',
              newValue: '',
              path: rankThoughtsFirstMatch(getState(), ['test', 'a']) as SimplePath,
            }),
          ),
      ])

      const thought = await findThoughtByText('b')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_bc')
    })
  })
})
