import { vi } from 'vitest'
import { toggleSortActionCreator } from '../toggleSort'
import { setSortPreferenceActionCreator } from '../setSortPreference'
import { HOME_PATH } from '../../constants'

// Mock the scrollCursorIntoView function
vi.mock('../../redux-middleware/scrollCursorIntoView', () => ({
  scrollCursorIntoView: vi.fn(),
  __esModule: true,
  default: vi.fn(),
}))

describe('Scroll cursor into view on sort', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call scrollCursorIntoView when toggling sort', async () => {
    const { scrollCursorIntoView } = await import('../../redux-middleware/scrollCursorIntoView')
    const mockDispatch = vi.fn()
    
    const thunk = toggleSortActionCreator({ simplePath: HOME_PATH })
    thunk(mockDispatch)
    
    expect(scrollCursorIntoView).toHaveBeenCalledTimes(1)
  })

  it('should call scrollCursorIntoView when setting sort preference', async () => {
    const { scrollCursorIntoView } = await import('../../redux-middleware/scrollCursorIntoView')
    const mockDispatch = vi.fn()
    
    const thunk = setSortPreferenceActionCreator({ 
      simplePath: HOME_PATH, 
      sortPreference: { type: 'Alphabetical', direction: 'Asc' }
    })
    thunk(mockDispatch)
    
    expect(scrollCursorIntoView).toHaveBeenCalledTimes(1)
  })
})