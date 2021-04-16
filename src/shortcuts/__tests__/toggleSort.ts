import { EM_TOKEN, HOME_PATH } from '../../constants'
import { createTestStore } from '../../test-helpers/createTestStore'
import { attribute, rankThoughtsFirstMatch } from '../../selectors'
import { existingThoughtChange, importText, newThought, setCursor, toggleAttribute } from '../../action-creators'
import toggleSortShortcut from '../toggleSort'
import executeShortcut from '../../test-helpers/executeShortcut'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import { SimplePath, Thunk } from '../../types'
import { store } from '../../store'
import { findThoughtByText } from '../../test-helpers/queries'
import { findAllByPlaceholderText } from '@testing-library/react'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'

it('toggle on sort preference of cursor (initial state without =sort attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - d
          - b
          - c
          - e`
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
})

it('toggle off sort preference of cursor (initial state with =sort/Alphabetical)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - a
          - =sort
            - Alphabetical
          - d
          - b
          - c
          - e`
    }),
    setCursorFirstMatchActionCreator(['a']),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe(null)
})

it('toggle on sort preference of home context when cursor is null (initial state without =sort attribute)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - b
          - 1
          - 2
        - a
          - 3
          - 4`
    }),

    setCursor({ path: null }),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), [], '=sort')).toBe('Alphabetical')
})

it('toggle off sort preference of home context when cursor is null (initial state with =sort/Alphabetical)', () => {

  const store = createTestStore()

  // import thoughts
  store.dispatch([
    importText({
      path: HOME_PATH,
      text: `
        - =sort
          - Alphabetical
        -a
        -b`
    }),

    setCursor({ path: null }),
  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), [], '=sort')).toBe(null)
})

it('override global Alphabetical with local None', () => {

  const store = createTestStore()

  store.dispatch([

    importText({
      path: HOME_PATH,
      text: `
        - a
          - d
          - b
          - c
          - e
    ` }),

    ((dispatch, getState) => dispatch(existingThoughtChange({
      context: [EM_TOKEN, 'Settings', 'Global Sort'],
      oldValue: 'None',
      newValue: 'Alphabetical',
      path: rankThoughtsFirstMatch(getState(), [EM_TOKEN, 'Settings', 'Global Sort', 'None']) as SimplePath
    }))) as Thunk,

    setCursorFirstMatchActionCreator(['a']),

  ])

  executeShortcut(toggleSortShortcut, { store })

  expect(attribute(store.getState(), ['a'], '=sort')).toBe('None')
})

describe('DOM', () => {
  beforeEach(async () => {
    await createTestApp()
  })
  afterEach(cleanupTestApp)

  it('thoughts are sorted alphabetically', async () => {
    const thoughtValue = 'c'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: 'a' }),
      newThought({ value: 'b' }),
      setCursor({ path: null }),
    ])

    store.dispatch(toggleAttribute({
      context: ['__ROOT__'],
      key: '=sort',
      value: 'Alphabetical',
    }))

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const thoughtsWrapper = thought!.closest('ul') as HTMLElement
    const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')

    expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
  })

  it('subthoughts are sorted alphabetically', async () => {

    const thoughtValue = 'a'
    store.dispatch([
      newThought({ value: thoughtValue }),
      newThought({ value: '3', insertNewSubthought: true }),
      newThought({ value: '1' }),
      newThought({ value: '2' }),
      setCursorFirstMatchActionCreator([thoughtValue])
    ])

    store.dispatch(toggleAttribute({
      context: ['a'],
      key: '=sort',
      value: 'Alphabetical',
    }))

    const thought = await findThoughtByText(thoughtValue)
    expect(thought).toBeTruthy()

    const thoughtChildrenWrapper = thought!.closest('li')?.lastElementChild as HTMLElement
    const thoughtChildren = await findAllByPlaceholderText(thoughtChildrenWrapper, 'Add a thought')

    expect(thoughtChildren.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])
  })

  describe('empty thought ordering is preserved at the point of creation', () => {

    it('after first thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('a_bcdef')
    })

    it('after middle thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc_def')
    })

    it('after last thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['f']),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcdef_')
    })

    it('before first thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['a']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_abcdef')
    })

    it('before middle thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('ab_cdef')
    })

    it('before last thought', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['f']),
        newThought({ value: '', insertBefore: true }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcde_f')
    })

    it('multiple empty thoughts', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
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
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_a_bc_def_')
    })

    // TODO
    it.skip('multiple contiguous empty thoughts', async () => {
      store.dispatch([
        importText({
          path: HOME_PATH,
          text: `
              - =sort
                - Alphabetical
              - d
              - f
              - a
              - c
              - e
              - b
          `
        }),
        setCursorFirstMatchActionCreator(['c']),
        newThought({ value: '' }),
        newThought({ value: '' }),
      ])

      const thought = await findThoughtByText('a')
      const thoughtsWrapper = thought!.closest('ul') as HTMLElement
      const thoughts = await findAllByPlaceholderText(thoughtsWrapper, 'Add a thought')
      const childrenString = thoughts.map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc__def')
    })

  })

})
