import { screen } from '@testing-library/dom'
import { findAllByPlaceholderText } from '@testing-library/react'
import SimplePath from '../../@types/SimplePath'
import Thunk from '../../@types/Thunk'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setFirstSubthoughtActionCreator as setFirstSubthought } from '../../actions/setFirstSubthought'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { toggleSortActionCreator } from '../../actions/toggleSort'
import { EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import attributeByContext from '../../test-helpers/attributeByContext'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { createTestStore } from '../../test-helpers/createTestStore'
import { deleteThoughtAtFirstMatchActionCreator } from '../../test-helpers/deleteThoughtAtFirstMatch'
import executeShortcut from '../../test-helpers/executeShortcut'
import { findThoughtByText } from '../../test-helpers/queries'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import toggleSortShortcut from '../toggleSort'

describe('store', () => {
  describe('local', () => {
    it('NULL -> Asc', () => {
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
        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
    })

    it('Asc -> Desc', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - =sort
                - Alphabetical
                  - Asc
              - b
              - c
              - d
              - e
          `,
        }),
        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
    })

    it('Desc -> NULL', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - =sort
                - Alphabetical
                  - Desc
              - b
              - c
              - d
              - e`,
        }),
        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe(null)
    })

    it('None -> Asc (home)', () => {
      const store = createTestStore()

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

        setCursor(null),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), [HOME_TOKEN], '=sort')).toBe('Alphabetical')
    })

    it('Asc -> Desc (home)', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - =sort
              - Alphabetical
            -a
            -b`,
        }),

        setCursor(null),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), [HOME_TOKEN], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['=sort'], 'Alphabetical')).toBe('Desc')
    })

    it('sort new thoughts after toggling sort', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - c
            - a
            - b`,
        }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
        newThought({ value: 'e', preventSetCursor: true }),
        newThought({ value: 'd', preventSetCursor: true }),
      ])

      const state = store.getState()
      expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - b
  - c
  - d
  - e`)
    })

    it('restore sort order', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - c
            - a
            - b`,
        }),
      ])

      executeShortcut(toggleSortShortcut, { store })
      executeShortcut(toggleSortShortcut, { store })
      executeShortcut(toggleSortShortcut, { store })

      const state = store.getState()
      expect(attributeByContext(state, [HOME_TOKEN], '=sort')).toBe(null)

      expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - c
  - a
  - b`)
    })

    it('restore sort order after new thoughts are added', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - c
            - a
            - b`,
        }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
        newThought({ value: 'e', preventSetCursor: true }),
        newThought({ value: 'd', preventSetCursor: true }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
      ])

      const state = store.getState()
      const a = contextToThought(state, ['a'])!
      const b = contextToThought(state, ['b'])!
      const c = contextToThought(state, ['c'])!

      // check that c, a, and b are in the original order
      expect(c.rank).toBeLessThan(a.rank)
      expect(a.rank).toBeLessThan(b.rank)
    })

    it('restore sort order after some thoughts are removed', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - d
            - e
            - c
            - a
            - b`,
        }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
        deleteThoughtAtFirstMatchActionCreator(['d']),
        deleteThoughtAtFirstMatchActionCreator(['e']),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
        toggleSortActionCreator({ simplePath: HOME_PATH }),
      ])

      const state = store.getState()
      expect(attributeByContext(state, [HOME_TOKEN], '=sort')).toBe(null)

      expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - c
  - a
  - b`)
    })
  })

  describe('global sort', () => {
    it('Asc -> NULL when global is Desc', () => {
      const store = createTestStore()

      store.dispatch([
        importText({
          text: `
            - a
              - =sort
                - Alphabetical
                  - Asc
              - b
              - c
              - d
              - e
          `,
        }),

        toggleAttribute({
          path: [EM_TOKEN],
          values: ['Settings', 'Global Sort', 'Alphabetical', 'Desc'],
        }),

        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })
      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe(null)
    })

    it('NULL -> None when global is Desc', () => {
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

        toggleAttribute({
          path: [EM_TOKEN],
          values: ['Settings', 'Global Sort', 'Alphabetical', 'Desc'],
        }),

        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })
      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('None')
    })

    it('override global Asc with local Desc', () => {
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

        toggleAttribute({
          path: [EM_TOKEN],
          values: ['Settings', 'Global Sort', 'Alphabetical'],
        }),

        setCursor(['a']),
      ])

      executeShortcut(toggleSortShortcut, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
    })
  })
})

// TODO: toggleSort DOM tests broke with LayoutTree since the DOM hierarchy changed.
describe.skip('DOM', () => {
  beforeEach(async () => {
    await createTestApp()
  })
  afterEach(cleanupTestApp)

  describe('local', () => {
    it('home: Asc', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'a' }),
        newThought({ value: 'b' }),
        setCursor(null),

        toggleAttribute({
          path: HOME_PATH,
          values: ['=sort', 'Alphabetical'],
        }),
      ])

      const thought = await findThoughtByText('c')
      expect(thought).toBeTruthy()

      const thoughts = await screen.findAllByPlaceholderText('Add a thought')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
    })

    it('subthoughts: Asc', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),
        setCursor(['a']),

        (dispatch, getState) =>
          dispatch(
            toggleAttribute({
              path: contextToPath(getState(), ['a']),
              values: ['=sort', 'Alphabetical'],
            }),
          ),
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
    })

    it('home: Desc', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'a' }),
        newThought({ value: 'b' }),
        setCursor(null),
      ])

      store.dispatch([
        toggleAttribute({
          path: HOME_PATH,
          values: ['=sort', 'Alphabetical'],
        }),
        (dispatch, getState) =>
          dispatch(
            setFirstSubthought({
              path: contextToPath(getState(), ['=sort', 'Alphabetical'])!,
              value: 'Desc',
            }),
          ),
      ])

      const thought = await findThoughtByText('c')
      expect(thought).toBeTruthy()

      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['c', 'b', 'a'])
    })

    it('subthoughts: Desc', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),
        setCursor(['a']),
      ])

      store.dispatch([
        (dispatch, getState) =>
          dispatch(
            toggleAttribute({
              path: contextToPath(getState(), ['a']),
              values: ['=sort', 'Alphabetical'],
            }),
          ),
        (dispatch, getState) =>
          dispatch(
            setFirstSubthought({
              path: contextToPath(getState(), ['a', '=sort', 'Alphabetical'])!,
              value: 'Desc',
            }),
          ),
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '1'])
    })
  })

  describe('global', () => {
    it('home: Asc', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'b' }),
        newThought({ value: 'a' }),
        setCursor(null),

        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: contextToPath(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,
      ])

      const thought = await findThoughtByText('c')
      expect(thought).toBeTruthy()

      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
    })

    it('subthoughts: Asc', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),
        setCursor(['a']),
        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: contextToPath(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
    })

    it('subthoughts: override global Asc with None', async () => {
      store.dispatch([
        newThought({ value: 'a' }),
        newThought({ value: '3', insertNewSubthought: true }),
        newThought({ value: '1' }),
        newThought({ value: '2' }),

        setCursor(['a']),

        ((dispatch, getState) =>
          dispatch(
            editThought({
              context: [EM_TOKEN, 'Settings', 'Global Sort'],
              oldValue: 'None',
              newValue: 'Alphabetical',
              path: contextToPath(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath,
            }),
          )) as Thunk,

        (dispatch, getState) =>
          dispatch(
            toggleAttribute({
              path: contextToPath(getState(), ['a']),
              values: ['=sort', 'None'],
            }),
          ),
      ])

      const thought = await findThoughtByText('a')
      expect(thought).toBeTruthy()

      const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
      const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

      expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '1', '2'])
    })
  })

  describe('empty thought ordering is preserved at the point of creation', () => {
    it('after first thought', async () => {
      store.dispatch([
        importText({
          text: `
            - =sort
              - Alphabetical
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['a']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['c']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['f']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['a']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['c']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['f']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['a']),
        newThought({ value: '', insertBefore: true }),
        setCursor(['a']),
        newThought({ value: '' }),
        setCursor(['c']),
        newThought({ value: '' }),
        setCursor(['f']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['a']),
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
            - a
            - b
            - c
            - d
            - e
            - f
          `,
        }),
        setCursor(['c']),
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
              - b
              - c
              - d
              - e
              - f
          `,
        }),
        setCursor(['a']),
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
              - b
              - c
              - d
              - e
              - f
          `,
        }),
        setCursor(['a']),
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
              - a
              - b
              - c
          `,
        }),
        setCursor(['test', 'a']),
        // wrap in a thunk in order to access fresh state
        (dispatch, getState) =>
          dispatch(
            editThought({
              context: ['test'],
              oldValue: 'a',
              newValue: '',
              path: contextToPath(getState(), ['test', 'a']) as SimplePath,
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
