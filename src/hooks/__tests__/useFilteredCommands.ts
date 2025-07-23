/**
 * Comprehensive tests for useFilteredCommands hook.
 *
 * Test Coverage:
 * - Alphabetize
 * - Alphabetize using inverse label
 * - Filter by search
 * - Case insensitive search
 * - Fuzzy search support
 * - Sort exact match to top
 * - Sort startsWith above contains matches
 * - Sort contiguous matches above noncontiguous matches
 * - Param: platformCommandsOnly filtering
 * - Mobile: Always show cancel command when gesture in progress
 * - Mobile: Always show gesture cheatsheet
 * - Sort enabled commands above disabled commands (when sortActiveCommandsFirst is true)
 * - Sort recent commands to top
 * - Sort selected command to top
 * - Mobile: Sort cancel to bottom
 * - Mobile: Sort gesture cheatsheet second-to-bottom
 * - Mobile: Filter commands that match gesture in progress
 * - Mobile: Sort commands by gesture length first, then by label (fewer swipes first)
 * - Edge cases: empty search, spaces-only search, commands without keyboard/gesture.
 */
import { renderHook } from '@testing-library/react'
import React, { act } from 'react'
import { Provider } from 'react-redux'
import Command from '../../@types/Command'
import CommandId from '../../@types/CommandId'
import * as browser from '../../browser'
import store from '../../stores/app'
import gestureStore from '../../stores/gesture'
import useFilteredCommands from '../useFilteredCommands'

vi.mock('../../browser')

vi.mock('../../commands', () => ({
  globalCommands: [
    {
      id: 'newThought' as CommandId,
      label: 'New Thought',
      gesture: 'rd',
      keyboard: { key: 'Enter' },
      multicursor: false,
      // No canExecute means always enabled
      exec: vi.fn(),
    },
    {
      id: 'newSubthought' as CommandId,
      label: 'New Subthought',
      gesture: 'rdr',
      keyboard: { key: 'Enter', meta: true },
      multicursor: false,
      exec: vi.fn(),
      canExecute: () => true, // This command is enabled
    },
    {
      id: 'newGrandChild' as CommandId,
      label: 'New Grandchild',
      gesture: 'rdrd',
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'back' as CommandId,
      label: 'Back',
      gesture: 'r',
      keyboard: 'Escape',
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'contextView' as CommandId,
      label: 'Context View',
      gesture: 'ru',
      keyboard: { key: 's', shift: true, alt: true },
      multicursor: false,
      exec: vi.fn(),
      canExecute: () => false, // This command is disabled
    },
    {
      id: 'openGestureCheatsheet' as CommandId,
      label: 'Gesture Cheatsheet',
      gesture: 'rdld',
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'cancel' as CommandId,
      label: 'Cancel',
      gesture: undefined,
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'noKeyboardCommand' as CommandId,
      label: 'No Keyboard Command',
      gesture: 'dl',
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'noGestureCommand' as CommandId,
      label: 'No Gesture Command',
      keyboard: { key: 'g' },
      multicursor: false,
      exec: vi.fn(),
    },
    {
      id: 'hiddenCommand' as CommandId,
      label: 'Hidden Command',
      gesture: 'du',
      multicursor: false,
      hideFromCommandPalette: true,
      exec: vi.fn(),
    },
    {
      id: 'toggleHiddenThoughts' as CommandId,
      label: 'Show Hidden Thoughts',
      labelInverse: 'Hide Hidden Thoughts',
      description: 'Show all hidden thoughts.',
      descriptionInverse: 'Hide hidden thoughts.',
      keyboard: { key: 'h', shift: true, alt: true },
      multicursor: false,
      exec: vi.fn(),
      isActive: () => true, // This command is active
    },
    {
      id: 'selectAll' as CommandId,
      label: 'Select All',
      labelInverse: 'Deselect All',
      description: 'Selects all thoughts at the current level. May reduce wrist strain.',
      descriptionInverse: 'Deselects all thoughts at the current level.',
      gesture: 'ldr',
      keyboard: [
        { key: 'a', meta: true, alt: true },
        { key: 'a', meta: true },
      ],
      isActive: () => false, // This command is inactive
    },
    {
      id: 'neitherCommand' as CommandId,
      label: 'Neither Command',
      multicursor: false,
      exec: vi.fn(),
    },
  ],
  gestureString: (command: Command): string =>
    (typeof command.gesture === 'string' ? command.gesture : command.gesture?.[0] || '') as string,
}))

/**
 * Test wrapper component that provides Redux store context.
 * Required for testing hooks that depend on Redux state.
 *
 * @param children - React components to wrap with the Redux Provider.
 * @returns JSX element with Redux Provider wrapping the children.
 */
const wrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(Provider, { store, children })
}

describe('useFilteredCommands', () => {
  beforeEach(() => {
    // Reset stores
    store.dispatch({ type: 'clear', full: true })
    gestureStore.update({ gesture: '', possibleCommands: [] })
    vi.clearAllMocks()
  })

  describe('Desktop (keyboard) mode', () => {
    beforeEach(() => {
      // Set to desktop mode
      vi.mocked(browser).isTouch = false
    })

    describe('Basic filtering and sorting', () => {
      it('should return all commands with keyboard shortcuts when no search term', () => {
        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).toContain('newSubthought')
        expect(commandIds).toContain('back')
        expect(commandIds).toContain('contextView')
        expect(commandIds).not.toContain('openGestureCheatsheet')
        expect(commandIds).not.toContain('cancel')
        expect(commandIds).not.toContain('hiddenCommand')
      })

      it('should alphabetize commands by label', () => {
        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        const expectedSortedLabels = [...labels].sort()

        expect(labels).toEqual(expectedSortedLabels)
      })

      it('should alphabetize using inverse label when command is active and sortActiveCommandsFirst is true', () => {
        const { result } = renderHook(() => useFilteredCommands('', { sortActiveCommandsFirst: true }), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        // The active command should be sorted by its inverse label "Hide Hidden Thoughts"
        // "Hide Hidden Thoughts" comes before "New Thought" alphabetically, so "Show Hidden Thoughts" should appear first
        expect(labels).toContain('Show Hidden Thoughts')

        // Since command is active, inverse label is used: "Hide Hidden Thoughts"
        const showHiddenIndex = labels.indexOf('Show Hidden Thoughts')
        // Since command is not toggling command, regular label is used always: "New Thought"
        const newThoughtIndex = labels.indexOf('New Thought')

        // Since "Hide Hidden Thoughts" (inverse) < "New Thought" alphabetically,
        // "Show Hidden Thoughts" should come before "New Thought"
        expect(showHiddenIndex).toBeLessThan(newThoughtIndex)
      })

      it('should use regular label when command is not active', () => {
        const { result } = renderHook(() => useFilteredCommands('', { sortActiveCommandsFirst: true }), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        // The inactive command should be sorted by its regular label "Select All"
        // "New Thought" comes before "Select All" alphabetically
        expect(labels).toContain('Select All')
        expect(labels).toContain('New Thought')

        // Since command is not active, regular label is used: "Select All"
        const selectAllIndex = labels.indexOf('Select All')
        // Since command is not toggling command, regular label is used always: "New Thought"
        const newThoughtIndex = labels.indexOf('New Thought')
        console.log('pinIndex =', selectAllIndex, 'newThoughtIndex =', newThoughtIndex)

        expect(newThoughtIndex).toBeLessThan(selectAllIndex)
      })

      it('should ignore labelInverse when sortActiveCommandsFirst is false', () => {
        const { result } = renderHook(() => useFilteredCommands('', { sortActiveCommandsFirst: false }), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        // Even though command is active, regular label should be used for sorting
        // "New Thought" comes before "Show Hidden Thoughts" alphabetically
        expect(labels).toContain('Show Hidden Thoughts')
        expect(labels).toContain('New Thought')

        const showHiddenIndex = labels.indexOf('Show Hidden Thoughts')
        const newThoughtIndex = labels.indexOf('New Thought')

        // Regular labels used: "New Thought" < "Show Hidden Thoughts" alphabetically
        expect(newThoughtIndex).toBeLessThan(showHiddenIndex)
      })

      it('should sort startsWith matches above contains matches', () => {
        const { result } = renderHook(() => useFilteredCommands('new', {}), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        // Commands starting with "New" should come before those containing "new" elsewhere
        const newThoughtIndex = labels.indexOf('New Thought')
        const newSubthoughtIndex = labels.indexOf('New Subthought')
        const newGrandchildIndex = labels.indexOf('New Grandchild')

        // All "New" commands should be at the top
        expect(newThoughtIndex).toBeLessThan(3)
        expect(newSubthoughtIndex).toBeLessThan(3)
        expect(newGrandchildIndex).toBeLessThan(3)
      })

      it('should sort contiguous matches above noncontiguous matches', () => {
        // Test with a search that would create both contiguous and non-contiguous matches
        const { result } = renderHook(() => useFilteredCommands('bac', {}), { wrapper })

        const labels = result.current.map(cmd => cmd.label)

        // "Back" (contiguous match) should come before any non-contiguous matches
        const backIndex = labels.indexOf('Back')
        expect(backIndex).toBe(0) // Should be first since it's an exact contiguous match
      })

      it('should sort selected command to top', () => {
        // Test that commands matching the exact search term are sorted to the top
        const { result } = renderHook(() => useFilteredCommands('Context', {}), { wrapper })

        // "Context View" should be first as it exactly matches the search term
        expect(result.current[0].id).toBe('contextView')
      })
    })

    describe('Search functionality', () => {
      it('should filter commands by search term (case insensitive)', () => {
        const { result } = renderHook(() => useFilteredCommands('thought', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).toContain('newSubthought')
        expect(commandIds).not.toContain('back')
        expect(commandIds).not.toContain('contextView')
      })

      it('should support case insensitive search', () => {
        const { result } = renderHook(() => useFilteredCommands('thOUGHT', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).toContain('newSubthought')
      })

      it('should support fuzzy search', () => {
        const { result } = renderHook(() => useFilteredCommands('nw tht', {}), { wrapper })

        // Should find "New Thought" with fuzzy matching
        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
      })

      it('should sort exact match to top', () => {
        const { result } = renderHook(() => useFilteredCommands('back', {}), { wrapper })

        expect(result.current[0].id).toBe('back')
      })
    })

    describe('Parameter: platformCommandsOnly', () => {
      it('should only include commands with keyboard shortcuts when platformCommandsOnly is true', () => {
        const { result } = renderHook(() => useFilteredCommands('', { platformCommandsOnly: true }), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).not.toContain('noKeyboardCommand')
      })

      it('should include all commands when platformCommandsOnly is false', () => {
        const { result } = renderHook(() => useFilteredCommands('', { platformCommandsOnly: false }), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).toContain('noKeyboardCommand')
      })
    })
  })

  describe('Mobile (gesture) mode', () => {
    beforeEach(async () => {
      // Set to gesture mode
      vi.mocked(browser).isTouch = true
    })

    describe('Basic gesture filtering', () => {
      it('should filter commands that match gesture in progress', () => {
        act(() => {
          gestureStore.update({ gesture: 'r' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('back') // gesture: 'r'
        expect(commandIds).toContain('newThought') // gesture: 'rd'
        expect(commandIds).toContain('newSubthought') // gesture: 'rdr'
        expect(commandIds).toContain('contextView') // gesture: 'ru'
        expect(commandIds).not.toContain('activeCommand') // gesture: 'lu'
      })

      it('should always show cancel command when gesture is in progress', () => {
        act(() => {
          gestureStore.update({ gesture: 'r' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('cancel')
      })

      it('should always show gesture cheatsheet command', () => {
        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('openGestureCheatsheet')
      })
    })

    describe('Gesture sorting', () => {
      it('should sort commands by gesture length first, then by label', () => {
        act(() => {
          gestureStore.update({ gesture: 'r' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        // Find commands that start with 'r'
        const rCommands = result.current.filter(cmd => cmd.id !== 'openGestureCheatsheet' && cmd.id !== 'cancel')

        // Should be sorted: 'r' (1), then 'rd'/'ru' (2), then 'rdr' (3), then 'rdrd' (4)
        const gestureLengths = rCommands.map(cmd => {
          if (typeof cmd.gesture === 'string') return cmd.gesture.length
          if (Array.isArray(cmd.gesture)) return cmd.gesture[0]?.length || 0
          return 0
        })

        // Check that gesture lengths are non-decreasing
        for (let i = 1; i < gestureLengths.length; i++) {
          expect(gestureLengths[i]).toBeGreaterThanOrEqual(gestureLengths[i - 1])
        }
      })

      it('should sort exact gesture match to top', () => {
        act(() => {
          gestureStore.update({ gesture: 'rd' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        // The command with exact gesture match should be first (excluding special commands)
        const firstNonSpecial = result.current.find(cmd => cmd.id !== 'openGestureCheatsheet' && cmd.id !== 'cancel')
        expect(firstNonSpecial?.id).toBe('newThought')
      })

      it('should sort cancel to bottom', () => {
        act(() => {
          gestureStore.update({ gesture: 'r' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const lastCommand = result.current[result.current.length - 1]
        expect(lastCommand.id).toBe('cancel')
      })

      it('should sort gesture cheatsheet second-to-bottom', () => {
        act(() => {
          gestureStore.update({ gesture: 'r' })
        })

        const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

        const secondToLast = result.current[result.current.length - 2]
        expect(secondToLast.id).toBe('openGestureCheatsheet')
      })
    })

    describe('Parameter: platformCommandsOnly', () => {
      it('should only include commands with gestures when platformCommandsOnly is true', () => {
        const { result } = renderHook(() => useFilteredCommands('', { platformCommandsOnly: true }), { wrapper })

        const commandIds = result.current.map(cmd => cmd.id)
        expect(commandIds).toContain('newThought')
        expect(commandIds).not.toContain('noGestureCommand')
      })
    })
  })

  describe('Enabled/disabled command sorting', () => {
    beforeEach(() => {
      vi.mocked(browser).isTouch = false
    })

    it('should sort enabled commands above disabled commands when sortActiveCommandsFirst is true', () => {
      const { result } = renderHook(() => useFilteredCommands('', { sortActiveCommandsFirst: true }), { wrapper })

      const labels = result.current.map(cmd => cmd.label)
      const enabledIndex = labels.indexOf('New Subthought')
      const alwaysEnabledIndex = labels.indexOf('New Thought')
      const disabledIndex = labels.indexOf('Context View')

      // Both enabled commands should come before the disabled command
      expect(enabledIndex).toBeLessThan(disabledIndex)
      expect(alwaysEnabledIndex).toBeLessThan(disabledIndex)

      // All three commands should be present
      expect(enabledIndex).toBeGreaterThanOrEqual(0)
      expect(alwaysEnabledIndex).toBeGreaterThanOrEqual(0)
      expect(disabledIndex).toBeGreaterThanOrEqual(0)
    })

    it('should not prioritize enabled commands when sortActiveCommandsFirst is false', () => {
      const { result } = renderHook(() => useFilteredCommands('', { sortActiveCommandsFirst: false }), { wrapper })

      const labels = result.current.map(cmd => cmd.label)
      const enabledIndex = labels.indexOf('New Subthought')
      const disabledIndex = labels.indexOf('Context View')

      // Should be sorted alphabetically, not by enabled/disabled status
      // "Context View" should come before "New Subthought"
      expect(disabledIndex).toBeLessThan(enabledIndex)
    })
  })

  describe('Recent commands', () => {
    beforeEach(() => {
      vi.mocked(browser).isTouch = false
    })

    it('should sort recent commands to top', () => {
      const recentCommands: CommandId[] = ['contextView' as CommandId, 'newSubthought' as CommandId]
      const { result } = renderHook(() => useFilteredCommands('', { recentCommands }), { wrapper })

      expect(result.current[0].id).toBe('contextView')
      expect(result.current[1].id).toBe('newSubthought')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty search string', () => {
      const { result } = renderHook(() => useFilteredCommands('', {}), { wrapper })

      expect(result.current).toBeDefined()
      expect(result.current.length).toBeGreaterThan(0)
    })

    it('should handle search with only spaces', () => {
      const { result } = renderHook(() => useFilteredCommands('   ', {}), { wrapper })

      // Should treat as empty search
      expect(result.current).toBeDefined()
    })

    it('should handle commands with no gesture or keyboard', () => {
      const { result } = renderHook(() => useFilteredCommands('', { platformCommandsOnly: true }), { wrapper })

      const commandIds = result.current.map(cmd => cmd.id)
      expect(commandIds).not.toContain('neitherCommand')
    })
  })
})
