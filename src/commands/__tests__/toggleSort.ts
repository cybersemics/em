import { screen } from '@testing-library/dom'
import { findAllByPlaceholderText } from '@testing-library/react'
import { act } from 'react'
import SimplePath from '../../@types/SimplePath'
import Thunk from '../../@types/Thunk'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleAttributeActionCreator as toggleAttribute } from '../../actions/toggleAttribute'
import { toggleSortActionCreator } from '../../actions/toggleSort'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import attributeByContext from '../../test-helpers/attributeByContext'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { deleteThoughtAtFirstMatchActionCreator } from '../../test-helpers/deleteThoughtAtFirstMatch'
import initStore from '../../test-helpers/initStore'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import getDescendantsOfContext from '../../test-helpers/queries/getDescendantsOfContext'
import getThoughtByContext from '../../test-helpers/queries/getThoughtByContext'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import toggleSortCommand from '../toggleSort'

/**
 * Moved to the top because the non-DOM tests aren't properly cleaning up the store.
 */
describe('DOM', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  describe('local', () => {
    it('home: Asc', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - c
              - a
              - b
            `,
          }),
          setCursor(['a']),
        ])
      })

      await act(vi.runOnlyPendingTimersAsync)

      act(() => executeCommand(toggleSortCommand, { store }))

      await act(() => vi.runAllTimersAsync())

      const thoughtC = getThoughtByContext(['c'])
      expect(thoughtC).toBeTruthy()

      const thoughts = screen.getAllByLabelText('thought-container')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['a', 'b', 'c'])
    })

    it('subthoughts: Asc', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - a
                - 3
                - 1
                - 2
            `,
          }),
          setCursor(['a', '3']),
        ])
      })

      act(() => executeCommand(toggleSortCommand, { store }))

      await act(() => vi.runOnlyPendingTimersAsync())

      const thought = getThoughtByContext(['a'])
      expect(thought).toBeTruthy()

      const subthoughtsOfA = getDescendantsOfContext(['a'])

      expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['1', '2', '3'])

      // TODO: Why does the next test fail if we don't wait for all timers here?
      await act(() => vi.runAllTimersAsync())
    })

    it('home: Desc', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - =sort
                - Alphabetical
              -c
              -a
              -b`,
          }),

          setCursor(['a']),
        ])
      })

      act(() => executeCommand(toggleSortCommand, { store }))

      await act(() => vi.runAllTimersAsync())

      const thought = getThoughtByContext(['c'])
      expect(thought).toBeTruthy()

      const thoughts = screen.getAllByLabelText('thought-container')

      expect(thoughts.map((child: HTMLElement) => child.textContent)).toMatchObject(['c', 'b', 'a'])
    })

    it('subthoughts: Desc', async () => {
      act(() => {
        store.dispatch([
          importText({
            text: `
              - a
                - 3
                - 1
                - 2
            `,
          }),
          setCursor(['a', '3']),
        ])
      })

      act(() => executeCommand(toggleSortCommand, { store }))
      act(() => executeCommand(toggleSortCommand, { store }))

      await act(() => vi.runAllTimersAsync())

      const thoughtA = getThoughtByContext(['a'])
      expect(thoughtA).toBeTruthy()

      const subthoughtsOfA = getDescendantsOfContext(['a'])

      expect(subthoughtsOfA.map((child: HTMLElement) => child.textContent)).toMatchObject(['3', '2', '1'])
    })
  })

  describe.skip('global', () => {
    it('home: Asc', async () => {
      store.dispatch([
        newThought({ value: 'c' }),
        newThought({ value: 'b' }),
        newThought({ value: 'a' }),
        setCursor(['a']),

        ((dispatch, getState) =>
          dispatch(
            editThought({
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
        setCursor(['a', 'b']),
        ((dispatch, getState) =>
          dispatch(
            editThought({
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

        setCursor(['a', 'b']),

        ((dispatch, getState) =>
          dispatch(
            editThought({
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
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')
      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('a_bcdef')
    })

    it('after middle thought', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc_def')
    })

    it('after last thought', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcdef_')
    })

    it('before first thought', async () => {
      act(() => {
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
          setCursor(['a', 'b']),
          newThought({ value: '', insertBefore: true }),
        ])
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_abcdef')
    })

    it('before middle thought', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('ab_cdef')
    })

    it('before last thought', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abcde_f')
    })

    it('multiple empty thoughts', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_a_bc_def_')
    })

    it('only one empty subthought', async () => {
      act(() => {
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
          setCursor(['a', 'b']),
          newThought({ value: '', insertNewSubthought: true }),
        ])
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_')
    })

    it('multiple contiguous empty thoughts', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('abc__def')
    })

    it('except with insertNewSubthought', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('bcdef_')
    })

    it('except with insertNewSubthought and insertBefore', async () => {
      act(() => {
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
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_bcdef')
    })

    it('preserve sort order when thought is edited to empty instead of moving it back to its insertion point', async () => {
      act(() => {
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
                oldValue: 'a',
                newValue: '',
                path: contextToPath(getState(), ['test', 'a']) as SimplePath,
              }),
            ),
        ])
      })

      await act(() => vi.runAllTimersAsync())

      const thoughts = screen.getAllByLabelText('thought-container')

      const childrenString = thoughts
        .map((child: HTMLElement) => child.textContent)
        .map(value => value || '_')
        .join('')
      expect(childrenString).toMatch('_bc')
    })
  })
})

describe('store', () => {
  beforeEach(initStore)

  describe('local', () => {
    it('NULL -> Asc', () => {
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
        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
    })

    it('Asc -> Desc', () => {
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
        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
    })

    it('Desc -> NULL', () => {
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
        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe(null)
    })

    it('None -> Asc (home)', () => {
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

        setCursor(['a']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), [HOME_TOKEN], '=sort')).toBe('Alphabetical')
    })

    it('Asc -> Desc (home)', () => {
      store.dispatch([
        importText({
          text: `
            - =sort
              - Alphabetical
            -a
            -b`,
        }),

        setCursor(['a']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), [HOME_TOKEN], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['=sort'], 'Alphabetical')).toBe('Desc')
    })

    it('sort new thoughts after toggling sort', () => {
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
      store.dispatch([
        importText({
          text: `
            - c
            - a
            - b`,
        }),
      ])

      executeCommand(toggleSortCommand, { store })
      executeCommand(toggleSortCommand, { store })
      executeCommand(toggleSortCommand, { store })

      const state = store.getState()
      expect(attributeByContext(state, [HOME_TOKEN], '=sort')).toBe(null)

      expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - c
  - a
  - b`)
    })

    it('restore sort order after new thoughts are added', () => {
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

    it('preserve sort order after multiple sort', async () => {
      store.dispatch([
        importText({
          text: `
              - 1
              - 2
            `,
        }),
        setCursor(['1']),
      ])
      executeCommand(toggleSortCommand, { store })

      store.dispatch(
        editThought({
          oldValue: '1',
          newValue: '',
          path: contextToPath(store.getState(), ['1']) as SimplePath,
        }),
      )
      store.dispatch(
        editThought({
          oldValue: '',
          newValue: '3',
          path: contextToPath(store.getState(), ['']) as SimplePath,
        }),
      )
      const state = store.getState()
      const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
      expect(exported).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - 2
  - 3`)

      executeCommand(toggleSortCommand, { store })
      executeCommand(toggleSortCommand, { store })
      executeCommand(toggleSortCommand, { store })
      const newState = store.getState()
      const lastExported = exportContext(newState, [HOME_TOKEN], 'text/plain')
      expect(lastExported).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - 2
  - 3`)
    })
  })

  describe('global sort', () => {
    it('Asc -> NULL when global is Desc', () => {
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

        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })
      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe(null)
    })

    it('NULL -> None when global is Desc', () => {
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

        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })
      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('None')
    })

    it('override global Asc with local Desc', () => {
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

        setCursor(['a', 'b']),
      ])

      executeCommand(toggleSortCommand, { store })

      expect(attributeByContext(store.getState(), ['a'], '=sort')).toBe('Alphabetical')
      expect(attributeByContext(store.getState(), ['a', '=sort'], 'Alphabetical')).toBe('Desc')
    })
  })
})

describe('multicursor', () => {
  beforeEach(initStore)

  it('should sort the cursors with first-sibling filter', async () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(toggleSortCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - b
  - c`)
  })

  it('should handle nested thoughts', async () => {
    store.dispatch([
      importText({
        text: `
          - y
            - =sort
              - Alphabetical
                - Asc
            - d
            - e
            - f
          - x
            - a
            - b
            - c
        `,
      }),
      setCursor(['y']),
      addMulticursor(['y']),
      addMulticursor(['y', 'd']),
      addMulticursor(['y', 'e']),
      addMulticursor(['y', 'f']),
      addMulticursor(['x']),
      addMulticursor(['x', 'a']),
      addMulticursor(['x', 'b']),
      addMulticursor(['x', 'c']),
    ])

    executeCommandWithMulticursor(toggleSortCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - x
    - =sort
      - Alphabetical
        - Asc
    - a
    - b
    - c
  - y
    - f
    - e
    - d
    - =sort
      - Alphabetical
        - Desc`)
  })

  it('should maintain multicursor after sorting', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(toggleSortCommand, { store })

    const state = store.getState()
    const exported = exportContext(state, [HOME_TOKEN], 'text/plain')

    const a = contextToPath(state, ['a'])!
    const b = contextToPath(state, ['b'])!
    const c = contextToPath(state, ['c'])!

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - =sort
    - Alphabetical
      - Asc
  - a
  - b
  - c`)

    expect(state.multicursors).toEqual({
      [hashPath(a)]: a,
      [hashPath(b)]: b,
      [hashPath(c)]: c,
    })
  })
})
