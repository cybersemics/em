import { renderHook } from '@testing-library/react'
import { ReactNode, act, createElement } from 'react'
import { shallowEqual } from 'react-redux'
import State from '../../@types/State'
import { errorActionCreator as error } from '../../actions/error'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import EditorProvider from '../../components/EditorProvider'
import db from '../../data-providers/thoughtspace'
import { getChildrenRanked } from '../../selectors/getChildren'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import useEditorSelector from '../useEditorSelector'
import useSelectorEffect from '../useSelectorEffect'

/** Supplies the real editor and UI stores to the hook under test. */
const wrapper = ({ children }: { children: ReactNode }) => createElement(EditorProvider, { store, children })

beforeEach(initStore)
afterEach(waitForThoughtspaceIdle)

it('updates document selectors and effects without notifying the UI-only Redux store', async () => {
  store.dispatch(importText({ text: '- a', preventSetCursor: true }))
  const captured = store.getState()
  const a = contextToThought(captured, ['a'])!
  const ui = store.uiStore.getState()
  const notified = vi.fn()
  const effect = vi.fn()
  const unsubscribe = store.uiStore.subscribe(notified)
  /** Selects the same thought from each captured document. */
  const select = (state: State) => getThoughtById(state, a.id)
  const { result } = renderHook(
    () => {
      useSelectorEffect(effect, select)
      return useEditorSelector(select)
    },
    { wrapper },
  )
  try {
    expect(ui).not.toHaveProperty('thoughts')
    expect(result.current).toBe(a)

    await act(async () => {
      db.transact(transaction =>
        transaction.update({ thoughtIndexUpdates: { [a.id]: { ...a, value: 'updated directly' } } }),
      )
      await vi.runOnlyPendingTimersAsync()
    })

    expect(result.current!.value).toBe('updated directly')
    expect(effect).toHaveBeenCalledExactlyOnceWith(result.current)
    expect(store.uiStore.getState()).toBe(ui)
    expect(notified).not.toHaveBeenCalled()
    expect(getThoughtById(captured, a.id)).toBe(a)
    expect(a.value).toBe('a')
  } finally {
    unsubscribe()
  }
})

it('preserves an equal fresh-object selection across unrelated UI and document changes', () => {
  store.dispatch(importText({ text: '- a\n- b', preventSetCursor: true }))
  const a = contextToThought(store.getState(), ['a'])!
  const b = contextToThought(store.getState(), ['b'])!
  const rendered = vi.fn()
  const { result } = renderHook(
    () => {
      const selected = useEditorSelector(state => ({ value: getThoughtById(state, a.id)!.value }), shallowEqual)
      rendered(selected)
      return selected
    },
    { wrapper },
  )
  const selected = result.current
  rendered.mockClear()

  act(() => {
    store.dispatch(error({ value: 'Unrelated UI update' }))
  })
  expect(store.uiStore.getState().error).toBe('Unrelated UI update')
  expect(result.current).toBe(selected)
  expect(rendered).not.toHaveBeenCalled()

  act(() => {
    db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [b.id]: { ...b, value: 'other' } } }))
  })
  expect(getThoughtById(store.getState(), b.id)!.value).toBe('other')
  expect(result.current).toBe(selected)
  expect(rendered).not.toHaveBeenCalled()

  act(() => {
    db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [a.id]: { ...a, value: 'selected' } } }))
  })
  expect(result.current).toEqual({ value: 'selected' })
  expect(result.current).not.toBe(selected)
  expect(rendered).toHaveBeenCalledExactlyOnceWith(result.current)
})

it('publishes coherent cursor and document snapshots for local creation and provider-driven deletion', () => {
  store.dispatch([importText({ text: '- parent' }), setCursor(['parent'])])
  const before = store.getState()
  const parent = contextToThought(before, ['parent'])!
  /** Reads cursor ancestry and children from one captured editor snapshot. */
  const select = (state: State) => ({
    cursor: state.cursor?.map(id => getThoughtById(state, id)?.value) ?? null,
    children: getChildrenRanked(state, parent.id).map(thought => thought.value),
  })
  const { result } = renderHook(() => useEditorSelector(select), { wrapper })
  const observed: State[] = []
  const observedDuringUiPublication: State[] = []
  const unsubscribe = store.subscribe(() => observed.push(store.getState()))
  const unsubscribeUi = store.uiStore.subscribe(() => observedDuringUiPublication.push(store.getState()))
  try {
    act(() => {
      store.dispatch(newThought({ value: 'child', insertNewSubthought: true }))
    })
    const created = store.getState()
    const child = contextToThought(created, ['parent', 'child'])!
    expect(result.current).toEqual({ cursor: ['parent', 'child'], children: ['child'] })

    act(() => {
      // Provider publication uses the same cursor-repair boundary as an incoming document change.
      db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [child.id]: null } }))
    })

    expect(result.current).toEqual({ cursor: ['parent'], children: [] })
    expect(observed.map(select)).toEqual([
      { cursor: ['parent', 'child'], children: ['child'] },
      { cursor: ['parent'], children: [] },
    ])
    expect(observedDuringUiPublication).toEqual(observed)
    expect(select(before)).toEqual({ cursor: ['parent'], children: [] })
    expect(select(created)).toEqual({ cursor: ['parent', 'child'], children: ['child'] })
    expect(getThoughtById(store.getState(), child.id)).toBeUndefined()
  } finally {
    unsubscribe()
    unsubscribeUi()
  }
})

it.each([
  ['provider', db],
  ['Redux UI', store.uiStore],
] as const)('publishes a completed command before %s observers dispatch another action', (_, source) => {
  const unsubscribe = source.subscribe(() => {
    unsubscribe()
    expect(contextToThought(store.getState(), ['created'])?.value).toBe('created')
    store.dispatch(error({ value: 'Observer update' }))
  })
  try {
    store.dispatch(newThought({ value: 'created' }))
    expect(store.getState().error).toBe('Observer update')
    expect(store.getState().thoughts).toBe(db.project())
  } finally {
    unsubscribe()
  }
})
