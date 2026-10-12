import { renderHook } from '@testing-library/react'
import { ReactNode, act, createElement } from 'react'
import { shallowEqual } from 'react-redux'
import State from '../../@types/State'
import { errorActionCreator as error } from '../../actions/error'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { settingsActionCreator as settings } from '../../actions/settings'
import EditorProvider from '../../components/EditorProvider'
import { EM_TOKEN } from '../../constants'
import db from '../../data-providers/thoughtspace'
import { getChildrenRanked } from '../../selectors/getChildren'
import getEmThought from '../../selectors/getEmThought'
import getSetting from '../../selectors/getSetting'
import getThoughtById from '../../selectors/getThoughtById'
import zoomPath from '../../selectors/zoomPath'
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
  const a = contextToThought(store.getState(), ['a'])!
  const ui = store.uiStore.getState()
  const notified = vi.fn()
  const effect = vi.fn()
  const unsubscribe = store.uiStore.subscribe(notified)
  /** Selects an owned thought record from the current document. */
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

it('invalidates memoized selectors when a retained live reader advances', () => {
  store.dispatch([
    importText({ text: '- a\n  - =focus\n    - Zoom' }),
    settings({ key: 'Theme', value: 'Light' }),
    setCursor(['a']),
  ])
  const state = store.getState()
  const theme = contextToThought(state, [EM_TOKEN, 'Settings', 'Theme', 'Light'])!
  const zoom = contextToThought(state, ['a', '=focus', 'Zoom'])!
  expect(getSetting(state, 'Theme')).toBe('Light')
  expect(getEmThought(state, ['Settings', 'Theme'])).toBe('Light')
  expect(zoomPath(state)).not.toBeNull()

  db.transact(transaction =>
    transaction.update({ thoughtIndexUpdates: { [theme.id]: { ...theme, value: 'Dark' }, [zoom.id]: null } }),
  )

  expect(getSetting(state, 'Theme')).toBe('Dark')
  expect(getEmThought(state, ['Settings', 'Theme'])).toBe('Dark')
  expect(zoomPath(state)).toBeNull()
})

it('publishes coherent cursor and document selections for local creation and provider-driven deletion', () => {
  store.dispatch([importText({ text: '- parent' }), setCursor(['parent'])])
  const parent = contextToThought(store.getState(), ['parent'])!
  /** Reads cursor ancestry and children during one synchronous selection. */
  const select = (state: State) => ({
    cursor: state.cursor?.map(id => getThoughtById(state, id)?.value) ?? null,
    children: getChildrenRanked(state, parent.id).map(thought => thought.value),
  })
  const { result } = renderHook(() => useEditorSelector(select), { wrapper })
  const before = result.current
  const observed: ReturnType<typeof select>[] = []
  const observedDuringUiPublication: ReturnType<typeof select>[] = []
  const unsubscribe = store.subscribe(() => observed.push(select(store.getState())))
  const unsubscribeUi = store.uiStore.subscribe(() => observedDuringUiPublication.push(select(store.getState())))
  try {
    act(() => {
      store.dispatch(newThought({ value: 'child', insertNewSubthought: true }))
    })
    const created = result.current
    const child = contextToThought(store.getState(), ['parent', 'child'])!
    expect(result.current).toEqual({ cursor: ['parent', 'child'], children: ['child'] })

    act(() => {
      // Provider publication uses the same cursor-repair boundary as an incoming document change.
      db.transact(transaction => transaction.update({ thoughtIndexUpdates: { [child.id]: null } }))
    })

    expect(result.current).toEqual({ cursor: ['parent'], children: [] })
    expect(observed).toEqual([
      { cursor: ['parent', 'child'], children: ['child'] },
      { cursor: ['parent'], children: [] },
    ])
    expect(observedDuringUiPublication).toEqual(observed)
    expect(before).toEqual({ cursor: ['parent'], children: [] })
    expect(created).toEqual({ cursor: ['parent', 'child'], children: ['child'] })
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
