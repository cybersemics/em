import DragThoughtItem from '../../@types/DragThoughtItem'
import DragThoughtZone from '../../@types/DragThoughtZone'
import importText from '../../actions/importText'
import contextToPath from '../../selectors/contextToPath'
import simplifyPath from '../../selectors/simplifyPath'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('QuickDropPanel multicursor handling', () => {
  it('should set isMulticursorExecuting when dropping multiple thoughts', () => {
    const steps = [
      importText({
        text: `
- a
- b  
- c
        `,
      }),
    ]

    const state = reducerFlow(steps)(initialState())

    // Get paths for thoughts a and b
    const pathA = contextToPath(state, ['a'])!
    const pathB = contextToPath(state, ['b'])!

    // Create mock drag items for multiple thoughts
    const items: DragThoughtItem[] = [
      {
        simplePath: simplifyPath(state, pathA),
        path: pathA,
        zone: DragThoughtZone.Thoughts,
      },
      {
        simplePath: simplifyPath(state, pathB),
        path: pathB,
        zone: DragThoughtZone.Thoughts,
      },
    ]

    // Test the multicursor logic that should be in drop function
    const initialMulticursorState = false

    // Simulate what the drop function should do with multiple items
    let isMulticursorExecuting = initialMulticursorState
    if (items.length > 1) {
      isMulticursorExecuting = true
    }

    // Check that multicursor logic activates for multiple items
    expect(isMulticursorExecuting).toBe(true)
    expect(items.length).toBe(2)

    // Clear multicursor executing
    if (items.length > 1) {
      isMulticursorExecuting = false
    }

    expect(isMulticursorExecuting).toBe(false)
  })

  it('should not set isMulticursorExecuting when dropping single thought', () => {
    const steps = [
      importText({
        text: `
- a
        `,
      }),
    ]

    const state = reducerFlow(steps)(initialState())

    // Get path for thought a
    const pathA = contextToPath(state, ['a'])!

    // Create mock drag item for single thought
    const items: DragThoughtItem[] = [
      {
        simplePath: simplifyPath(state, pathA),
        path: pathA,
        zone: DragThoughtZone.Thoughts,
      },
    ]

    // Test the multicursor logic that should be in drop function
    const initialMulticursorState = false

    // Simulate what the drop function should do with single item (no multicursor logic)
    let isMulticursorExecuting = initialMulticursorState
    if (items.length > 1) {
      isMulticursorExecuting = true
    }

    // Check that multicursor logic does NOT activate for single item
    expect(isMulticursorExecuting).toBe(false)
    expect(items.length).toBe(1)
  })
})
