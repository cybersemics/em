import { expectTypeOf } from 'vitest'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import CommandUniversePage from '../../@types/CommandUniversePage'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import commandUniverseBack from '../commandUniverseBack'
import commandUniverseForward from '../commandUniverseForward'
import commandUniverseNavigate, { commandUniverseNavigateActionCreator } from '../commandUniverseNavigate'
import commandUniverseSearch from '../commandUniverseSearch'
import commandUniverseSort from '../commandUniverseSort'
import toggleCommandUniverse, { toggleCommandUniverseActionCreator } from '../toggleCommandUniverse'

const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }
const origin = { x: 0.25, y: 0.5 }

it('derives page ids, props, and navigation options from the registered components', () => {
  type NavigateArguments = Parameters<typeof commandUniverseNavigateActionCreator>
  expectTypeOf<'commands' | 'detail'>().toMatchTypeOf<CommandUniversePage['pageId']>()
  expectTypeOf<['commands', Record<string, never>]>().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<
    ['detail', { command: Command }, { zoom: 'out'; origin: typeof origin }]
  >().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['detail', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['commands', { command: Command }]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['missing', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
})

it('starts at the commands root with no history', () => {
  const state = toggleCommandUniverse(initialState(), { value: true })
  expect(commandUniverseBack(state)).toBe(state)
  expect(commandUniverseForward(state)).toBe(state)
  expect(state.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'root', page: { pageId: 'commands', props: {} }, arrival: null }],
    index: 0,
    search: '',
    sortOrder: 'type',
  })
})

it('records each entry arrival and keeps it through Back and Forward', () => {
  const state = toggleCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'detail-a',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'out', origin },
  })
  expect(visited.commandUniverseNavigation.entries[1]).toMatchObject({
    entryId: 'detail-a',
    arrival: { zoom: 'out', origin },
  })

  const back = commandUniverseBack(visited)
  expect(back.commandUniverseNavigation.index).toBe(0)

  const forward = commandUniverseForward(back)
  expect(forward.commandUniverseNavigation.index).toBe(1)
  expect(forward.commandUniverseNavigation.entries).toBe(visited.commandUniverseNavigation.entries)
})

it('accepts an explicit zoom transition', () => {
  const state = toggleCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'zoom-detail',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
    transition: 'zoom',
  })

  expect(visited.commandUniverseNavigation.entries[1].arrival?.type).toBe('zoom')
})

it('supports no transition for a direct detail visit while retaining its Back history', () => {
  const state = toggleCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'direct-detail',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
    transition: 'none',
  })

  expect(visited.commandUniverseNavigation.entries.map(entry => entry.page.pageId)).toEqual(['commands', 'detail'])
  expect(visited.commandUniverseNavigation.entries[1].arrival?.type).toBe('none')
  const back = commandUniverseBack(visited)
  expect(back.commandUniverseNavigation.index).toBe(0)
})

it('drops the abandoned forward branch while keeping the reachable history', () => {
  const state = toggleCommandUniverse(initialState(), { value: true })
  const first = commandUniverseNavigate(state, {
    entryId: 'first',
    page: { pageId: 'detail', props: { command: { ...command, label: 'A' } } },
    arrival: { zoom: 'in', origin: null },
  })
  const second = commandUniverseNavigate(first, {
    entryId: 'second',
    page: { pageId: 'detail', props: { command: { ...command, label: 'B' } } },
    arrival: { zoom: 'in', origin: null },
  })
  const back = commandUniverseBack(second)
  const branched = commandUniverseNavigate(back, {
    entryId: 'branch',
    page: { pageId: 'detail', props: { command: { ...command, label: 'C' } } },
    arrival: { zoom: 'out', origin: null },
  })

  expect(
    branched.commandUniverseNavigation.entries.map(entry =>
      entry.page.pageId === 'detail' ? entry.page.props.command.label : 'commands',
    ),
  ).toEqual(['commands', 'A', 'C'])
  expect(commandUniverseForward(branched)).toBe(branched)
})

it('routes page visits through the global Redux store with distinct entry ids', async () => {
  await initStore()
  store.dispatch(toggleCommandUniverseActionCreator({ value: true }))
  const rootId = store.getState().commandUniverseNavigation.entries[0].entryId

  store.dispatch(commandUniverseNavigateActionCreator('detail', { command }, { origin }))

  const navigation = store.getState().commandUniverseNavigation
  expect(navigation.index).toBe(1)
  expect(navigation.entries.map(entry => entry.page.pageId)).toEqual(['commands', 'detail'])
  expect(navigation.entries[1].entryId).not.toBe(rootId)
  expect(navigation.entries[1].arrival).toEqual({ zoom: 'in', origin })
})

it('ignores navigation while closed and resets history when reopened', () => {
  const closed = initialState()
  expect(
    commandUniverseNavigate(closed, {
      entryId: 'ignored',
      page: { pageId: 'detail', props: { command } },
      arrival: { zoom: 'in', origin: null },
    }),
  ).toBe(closed)
  expect(commandUniverseBack(closed)).toBe(closed)
  expect(commandUniverseForward(closed)).toBe(closed)

  const open = toggleCommandUniverse(closed, { value: true, entryId: 'first-root' })
  const visited = commandUniverseNavigate(open, {
    entryId: 'visited',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
  })
  const closedAgain = toggleCommandUniverse(visited, { value: false })
  const reopened = toggleCommandUniverse(closedAgain, { value: true, entryId: 'second-root' })

  expect(reopened.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'second-root', page: { pageId: 'commands', props: {} }, arrival: null }],
    index: 0,
    search: '',
    sortOrder: 'type',
  })
})

it('retains search and sorting through Navigate, Back, and Forward', () => {
  const open = toggleCommandUniverse(initialState(), { value: true })
  const searched = commandUniverseSearch(commandUniverseSort(open, { value: 'alphabetical' }), { value: 'indent' })
  const detail = commandUniverseNavigate(searched, {
    entryId: 'search-detail',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
  })
  const back = commandUniverseBack(detail)
  const forward = commandUniverseForward(back)
  expect(detail.commandUniverseNavigation).toMatchObject({ search: 'indent', sortOrder: 'alphabetical' })
  expect(back.commandUniverseNavigation).toMatchObject({ search: 'indent', sortOrder: 'alphabetical' })
  expect(forward.commandUniverseNavigation).toMatchObject({ search: 'indent', sortOrder: 'alphabetical' })
})

it('clears the search on a fresh open', () => {
  const open = toggleCommandUniverse(initialState(), { value: true })
  const closed = toggleCommandUniverse(commandUniverseSearch(open, { value: 'indent' }), { value: false })
  const reopened = toggleCommandUniverse(closed, { value: true })
  expect(reopened.commandUniverseNavigation.search).toBe('')
})

it('keeps the chosen sort order across opens', () => {
  const open = toggleCommandUniverse(initialState(), { value: true })
  const closed = toggleCommandUniverse(commandUniverseSort(open, { value: 'alphabetical' }), { value: false })
  const reopened = toggleCommandUniverse(closed, { value: true })
  expect(reopened.commandUniverseNavigation.sortOrder).toBe('alphabetical')
})

describe('platform default sort order', () => {
  const desktopQuery = `(min-width: ${token('breakpoints.lg')})`

  /** Loads a fresh initialState module while the viewport does or does not match the lg breakpoint. */
  const loadInitialState = async (isDesktop: boolean) => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation(query =>
      query === desktopQuery ? { ...matchMedia(query), matches: isDesktop } : matchMedia(query),
    )
    vi.resetModules()
    const { default: freshInitialState } = await import('../../util/initialState')
    return freshInitialState
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts at Recently used when the app loads at the lg breakpoint and up', async () => {
    const freshInitialState = await loadInitialState(true)
    expect(freshInitialState().commandUniverseNavigation.sortOrder).toBe('recent')
  })

  it('starts at Type when the app loads below the lg breakpoint', async () => {
    const freshInitialState = await loadInitialState(false)
    expect(freshInitialState().commandUniverseNavigation.sortOrder).toBe('type')
  })
})
