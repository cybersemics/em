import { expectTypeOf } from 'vitest'
import Command from '../../@types/Command'
import CommandUniversePage from '../../@types/CommandUniversePage'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import initialState from '../../util/initialState'
import commandUniverseBack from '../commandUniverseBack'
import commandUniverseForward from '../commandUniverseForward'
import commandUniverseNavigate, { commandUniverseNavigateActionCreator } from '../commandUniverseNavigate'
import toggleMobileCommandUniverse, { toggleMobileCommandUniverseActionCreator } from '../toggleMobileCommandUniverse'

const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }
const origin = { x: 0.25, y: 0.5 }

it('derives page ids, props, and navigation options from the registered components', () => {
  type NavigateArguments = Parameters<typeof commandUniverseNavigateActionCreator>
  expectTypeOf<'grid' | 'detail'>().toMatchTypeOf<CommandUniversePage['pageId']>()
  expectTypeOf<['grid', Record<string, never>]>().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<
    ['detail', { command: Command }, { zoom: 'out'; origin: typeof origin }]
  >().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['detail', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['grid', { command: Command }]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['missing', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
})

it('starts at the grid root with no history', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  expect(commandUniverseBack(state)).toBe(state)
  expect(commandUniverseForward(state)).toBe(state)
  expect(state.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'root', page: { pageId: 'grid', props: {} }, arrival: null }],
    index: 0,
  })
})

it('records each entry arrival and keeps it through Back and Forward', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
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
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'zoom-detail',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
    transition: 'zoom',
  })

  expect(visited.commandUniverseNavigation.entries[1].arrival?.type).toBe('zoom')
})

it('supports no transition for a direct detail visit while retaining its Back history', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'direct-detail',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
    transition: 'none',
  })

  expect(visited.commandUniverseNavigation.entries.map(entry => entry.page.pageId)).toEqual(['grid', 'detail'])
  expect(visited.commandUniverseNavigation.entries[1].arrival?.type).toBe('none')
  const back = commandUniverseBack(visited)
  expect(back.commandUniverseNavigation.index).toBe(0)
})

it('drops the abandoned forward branch while keeping the reachable history', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
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
      entry.page.pageId === 'detail' ? entry.page.props.command.label : 'grid',
    ),
  ).toEqual(['grid', 'A', 'C'])
  expect(commandUniverseForward(branched)).toBe(branched)
})

it('routes page visits through the global Redux store with distinct entry ids', async () => {
  await initStore()
  store.dispatch(toggleMobileCommandUniverseActionCreator({ value: true }))
  const rootId = store.getState().commandUniverseNavigation.entries[0].entryId

  store.dispatch(commandUniverseNavigateActionCreator('detail', { command }, { origin }))

  const navigation = store.getState().commandUniverseNavigation
  expect(navigation.index).toBe(1)
  expect(navigation.entries.map(entry => entry.page.pageId)).toEqual(['grid', 'detail'])
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

  const open = toggleMobileCommandUniverse(closed, { value: true, entryId: 'first-root' })
  const visited = commandUniverseNavigate(open, {
    entryId: 'visited',
    page: { pageId: 'detail', props: { command } },
    arrival: { zoom: 'in', origin: null },
  })
  const closedAgain = toggleMobileCommandUniverse(visited, { value: false })
  const reopened = toggleMobileCommandUniverse(closedAgain, { value: true, entryId: 'second-root' })

  expect(reopened.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'second-root', page: { pageId: 'grid', props: {} }, arrival: null }],
    index: 0,
  })
})
