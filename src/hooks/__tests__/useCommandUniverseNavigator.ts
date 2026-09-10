import { act, renderHook } from '@testing-library/react'
import { PropsWithChildren, createElement } from 'react'
import { expectTypeOf } from 'vitest'
import Command from '../../@types/Command'
import CommandUniversePage from '../../@types/CommandUniversePage'
import CommandUniversePageNavigator from '../../@types/CommandUniversePageNavigator'
import CommandUniverseProvider from '../../components/CommandUniverse/CommandUniverseProvider'
import useCommandUniverseNavigator from '../useCommandUniverseNavigator'

const command: Command = { id: 'newThought', label: 'New Thought', exec: () => {}, multicursor: false }

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
  expect(result.current.transition).toBeNull()
})

it('records an outward visit and reverses its zoom when going back', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(() => result.current.open('grid', {}, { zoom: 'out', origin: { x: 10, y: 20, width: 30, height: 40 } }))
  expect(result.current.transition?.zoom).toBe('out')
  act(() => result.current.finishTransition(result.current.transition!.id))
  act(result.current.back)
  expect(result.current.activeEntryId).toBe(result.current.entries[0].entryId)
  expect(result.current.transition?.zoom).toBe('in')
  expect(result.current.transition?.origin).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  act(() => result.current.finishTransition(result.current.transition!.id))
  act(result.current.forward)
  expect(result.current.activeEntryId).toBe(result.current.entries[1].entryId)
  expect(result.current.transition?.zoom).toBe('out')
})

it('drops the abandoned forward branch while keeping the reachable history', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(() => result.current.open('detail', { command: { ...command, label: 'A' } }, { zoom: 'in' }))
  act(() => result.current.finishTransition(result.current.transition!.id))
  act(() => result.current.open('detail', { command: { ...command, label: 'B' } }, { zoom: 'in' }))
  act(() => result.current.finishTransition(result.current.transition!.id))
  act(result.current.back)
  act(() => result.current.finishTransition(result.current.transition!.id))
  const retainedIds = result.current.entries.slice(0, 2).map(entry => entry.entryId)
  act(() => result.current.open('detail', { command: { ...command, label: 'C' } }, { zoom: 'out' }))
  expect(
    result.current.entries.map(entry => (entry.page.pageId === 'detail' ? entry.page.props.command.label : 'grid')),
  ).toEqual(['grid', 'A', 'C'])
  expect(result.current.entries.slice(0, 2).map(entry => entry.entryId)).toEqual(retainedIds)
  act(() => result.current.finishTransition(result.current.transition!.id))
  expect(result.current.canGoForward).toBe(false)
  expect(result.current.canGoBack).toBe(true)
})

it('lets a visit interrupt the transition still running', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  const rootId = result.current.activeEntryId
  act(() => result.current.open('detail', { command }, { zoom: 'in' }))
  const interrupted = result.current.transition!
  // Back is offered immediately, so a mistaken tap can be undone without waiting the zoom out.
  expect(result.current.canGoBack).toBe(true)
  act(result.current.back)
  expect(result.current.activeEntryId).toBe(rootId)
  expect(result.current.transition!.id).not.toBe(interrupted.id)
  expect(result.current.transition!.zoom).toBe('out')
  // Completing the abandoned transition must not clear the one that replaced it.
  act(() => result.current.finishTransition(interrupted.id))
  expect(result.current.transition).not.toBeNull()
})

it('ignores a late completion from an earlier transition', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(() => result.current.open('detail', { command: { ...command, label: 'A' } }, { zoom: 'in' }))
  const oldId = result.current.transition!.id
  act(() => result.current.finishTransition(oldId))
  act(result.current.back)
  const current = result.current.transition
  act(() => result.current.finishTransition(oldId))
  expect(result.current.transition).toEqual(current)
  // Forward is reachable from here, and the stale completion must not have disturbed that.
  expect(result.current.canGoForward).toBe(true)
})

it('disables navigation while closed and resets the history when reopened', () => {
  const session = { isOpen: true }
  /** Keeps the provider mounted while changing its lifecycle input. */
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(CommandUniverseProvider, { isOpen: session.isOpen }, children)
  const { result, rerender } = renderHook(useCommandUniverseNavigator, { wrapper: Wrapper })
  act(() => result.current.open('detail', { command }))
  const oldId = result.current.transition!.id
  session.isOpen = false
  rerender()
  act(() => result.current.open('detail', { command: { ...command, label: 'ignored' } }))
  expect(result.current.canGoBack).toBe(false)
  session.isOpen = true
  rerender()
  act(() => result.current.finishTransition(oldId))
  expect(result.current.entries.map(entry => entry.page.pageId)).toEqual(['grid'])
  expect(result.current.transition).toBeNull()
  expect(result.current.canGoBack).toBe(false)
  expect(result.current.canGoForward).toBe(false)
})

it('keeps separate visits to the same page distinct', () => {
  const { result } = renderHook(useCommandUniverseNavigator, { wrapper: OpenProvider })
  act(() => result.current.open('detail', { command }))
  const firstId = result.current.activeEntryId
  act(() => result.current.finishTransition(result.current.transition!.id))
  act(() => result.current.open('detail', { command }))
  expect(result.current.activeEntryId).not.toBe(firstId)
  expect(result.current.entries.map(entry => entry.page.pageId)).toEqual(['grid', 'detail', 'detail'])
})
