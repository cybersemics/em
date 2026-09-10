import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, createElement } from 'react'
import { expectTypeOf } from 'vitest'
import Command from '../../@types/Command'
import CommandUniversePage from '../../@types/CommandUniversePage'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'
import CommandUniverseProvider from '../../components/CommandUniverse/CommandUniverseProvider'
import useCommandUniverseNavigator from '../useCommandUniverseNavigator'

/** Supplies an open session to the public consumer hook. */
const OpenProvider = ({ children }: PropsWithChildren) =>
  createElement(CommandUniverseProvider, { isOpen: true }, children)

it('derives page ids and their required props from the registered components', () => {
  type OpenArguments = Parameters<CommandUniversePageNavigator['open']>
  expectTypeOf<'grid' | 'detail'>().toMatchTypeOf<CommandUniversePage['pageId']>()
  expectTypeOf<['grid', Record<string, never>]>().toMatchTypeOf<OpenArguments>()
  expectTypeOf<['detail', { command: Command }]>().toMatchTypeOf<OpenArguments>()
  expectTypeOf<['detail', Record<string, never>]>().not.toMatchTypeOf<OpenArguments>()
  expectTypeOf<['grid', { command: Command }]>().not.toMatchTypeOf<OpenArguments>()
  expectTypeOf<['missing', Record<string, never>]>().not.toMatchTypeOf<OpenArguments>()
})

it('starts at a root with no back or forward history', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(result.current.back)
  act(result.current.forward)
  expect(result.current.entries.map(entry => entry.page.pageId)).toEqual(['grid'])
  expect(result.current.canGoBack).toBe(false)
  expect(result.current.canGoForward).toBe(false)
})

it('moves back and forward through recorded visits', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  const rootId = result.current.activeEntryId
  act(() => result.current.open('grid', {}))
  const visitedId = result.current.activeEntryId
  expect(result.current.canGoBack).toBe(true)
  act(result.current.back)
  expect(result.current.activeEntryId).toBe(rootId)
  expect(result.current.canGoForward).toBe(true)
  act(result.current.forward)
  expect(result.current.activeEntryId).toBe(visitedId)
})

it('drops the abandoned forward branch while keeping the reachable history', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(() => result.current.open('grid', {}))
  act(() => result.current.open('grid', {}))
  act(result.current.back)
  const retainedIds = result.current.entries.slice(0, 2).map(entry => entry.entryId)
  act(() => result.current.open('grid', {}))
  expect(result.current.entries).toHaveLength(3)
  expect(result.current.entries.slice(0, 2).map(entry => entry.entryId)).toEqual(retainedIds)
  expect(result.current.canGoForward).toBe(false)
  expect(result.current.canGoBack).toBe(true)
})

it('keeps separate visits to the same page distinct', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  const firstId = result.current.activeEntryId
  act(() => result.current.open('grid', {}))
  expect(result.current.activeEntryId).not.toBe(firstId)
  expect(result.current.entries.map(entry => entry.page.pageId)).toEqual(['grid', 'grid'])
})

it('disables navigation while closed and resets the history when reopened', () => {
  const session = { isOpen: true }
  /** Keeps the provider mounted while changing its lifecycle input. */
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(CommandUniverseProvider, { isOpen: session.isOpen }, children)
  const { result, rerender } = renderHook(useCommandUniverseNavigator, { wrapper: Wrapper })
  act(() => result.current.open('grid', {}))
  session.isOpen = false
  rerender()
  act(() => result.current.open('grid', {}))
  expect(result.current.canGoBack).toBe(false)
  session.isOpen = true
  rerender()
  expect(result.current.entries.map(entry => entry.page.pageId)).toEqual(['grid'])
  expect(result.current.canGoBack).toBe(false)
  expect(result.current.canGoForward).toBe(false)
})
