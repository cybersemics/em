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

it('derives page ids and their required props from the registered components', () => {
  type NavigateArguments = Parameters<typeof commandUniverseNavigateActionCreator>
  expectTypeOf<'grid' | 'detail'>().toMatchTypeOf<CommandUniversePage['pageId']>()
  expectTypeOf<['grid', Record<string, never>]>().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['detail', { command: Command }]>().toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['detail', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['grid', { command: Command }]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['grid', { unregistered: true }]>().not.toMatchTypeOf<NavigateArguments>()
  expectTypeOf<['missing', Record<string, never>]>().not.toMatchTypeOf<NavigateArguments>()
})

it('starts at the grid root with no back or forward history', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  expect(commandUniverseBack(state)).toBe(state)
  expect(commandUniverseForward(state)).toBe(state)
  expect(state.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'root', page: { pageId: 'grid', props: {} } }],
    index: 0,
  })
})

it('moves back and forward through recorded visits', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  const visited = commandUniverseNavigate(state, {
    entryId: 'visited',
    page: { pageId: 'grid', props: {} },
  })
  const back = commandUniverseBack(visited)
  expect(back.commandUniverseNavigation.index).toBe(0)
  expect(commandUniverseForward(back).commandUniverseNavigation.index).toBe(1)
})

it('drops the abandoned forward branch while keeping the reachable history', () => {
  const state = toggleMobileCommandUniverse(initialState(), { value: true })
  const first = commandUniverseNavigate(state, { entryId: 'first', page: { pageId: 'grid', props: {} } })
  const second = commandUniverseNavigate(first, { entryId: 'second', page: { pageId: 'grid', props: {} } })
  const back = commandUniverseBack(second)
  const branched = commandUniverseNavigate(back, { entryId: 'branch', page: { pageId: 'grid', props: {} } })

  expect(branched.commandUniverseNavigation).toEqual({
    entries: [
      { entryId: 'root', page: { pageId: 'grid', props: {} } },
      { entryId: 'first', page: { pageId: 'grid', props: {} } },
      { entryId: 'branch', page: { pageId: 'grid', props: {} } },
    ],
    index: 2,
  })
  expect(commandUniverseForward(branched)).toBe(branched)
})

it('routes page visits through the global Redux store and keeps repeated visits distinct', async () => {
  await initStore()
  store.dispatch(toggleMobileCommandUniverseActionCreator({ value: true }))
  const rootId = store.getState().commandUniverseNavigation.entries[0].entryId

  const command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false } satisfies Command
  store.dispatch(commandUniverseNavigateActionCreator('detail', { command }))

  const navigation = store.getState().commandUniverseNavigation
  expect(navigation.index).toBe(1)
  expect(navigation.entries.map(entry => entry.page.pageId)).toEqual(['grid', 'detail'])
  expect(navigation.entries[1].entryId).not.toBe(rootId)
})

it('ignores navigation while closed and resets the history when reopened', () => {
  const closed = initialState()
  expect(commandUniverseNavigate(closed, { entryId: 'ignored', page: { pageId: 'grid', props: {} } })).toBe(closed)
  expect(commandUniverseBack(closed)).toBe(closed)
  expect(commandUniverseForward(closed)).toBe(closed)

  const open = toggleMobileCommandUniverse(closed, { value: true, entryId: 'first-root' })
  const visited = commandUniverseNavigate(open, { entryId: 'visited', page: { pageId: 'grid', props: {} } })
  const closedAgain = toggleMobileCommandUniverse(visited, { value: false })
  const reopened = toggleMobileCommandUniverse(closedAgain, { value: true, entryId: 'second-root' })

  expect(reopened.commandUniverseNavigation).toEqual({
    entries: [{ entryId: 'second-root', page: { pageId: 'grid', props: {} } }],
    index: 0,
  })
})
