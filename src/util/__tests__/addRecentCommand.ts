import CommandId from '../../@types/CommandId'
import { MAX_RECENT_COMMANDS } from '../../constants'
import storageModel from '../../stores/storageModel'
import addRecentCommand from '../addRecentCommand'

beforeEach(() => {
  localStorage.clear()
})

it('moves a repeated command to the front instead of storing it twice', () => {
  addRecentCommand('bold' as CommandId)
  addRecentCommand('italic' as CommandId)
  addRecentCommand('bold' as CommandId)
  expect(storageModel.get('recentCommands')).toEqual(['bold', 'italic'])
})

it('keeps at most MAX_RECENT_COMMANDS commands', () => {
  for (let i = 0; i <= MAX_RECENT_COMMANDS; i++) addRecentCommand(`command${i}` as CommandId)
  const recent = storageModel.get('recentCommands')
  expect(recent).toHaveLength(MAX_RECENT_COMMANDS)
  expect(recent[0]).toBe(`command${MAX_RECENT_COMMANDS}`)
})

it('builds on what another writer stored', () => {
  storageModel.set('recentCommands', ['underline' as CommandId])
  addRecentCommand('bold' as CommandId)
  expect(storageModel.get('recentCommands')).toEqual(['bold', 'underline'])
})
