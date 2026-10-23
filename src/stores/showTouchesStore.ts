import storage from '../util/storage'
import reactMinistore from './react-ministore'

/** The localStorage key that remembers on this device whether Show Touches is on. */
const ENABLED_KEY = 'showTouches'

/** The localStorage key that remembers on this device that Auto Fade is off. Only stored while off, since on is the default. */
const AUTO_FADE_KEY = 'showTouchesAutoFade'

/**
 * The Show Touches settings. Device-local, persisted to localStorage rather than synced through /EM/Settings: Show
 * Touches is turned on to record one device, and should not start drawing on the account's other devices.
 */
const showTouchesStore = reactMinistore<{
  /** Whether Show Touches draws touches on this device. */
  enabled: boolean
  /** Whether each mark fades on its own, or every mark of a touch stays on screen until the next touch starts. */
  autoFade: boolean
}>({
  enabled: storage.getItem(ENABLED_KEY) === 'true',
  autoFade: storage.getItem(AUTO_FADE_KEY) !== 'false',
})

showTouchesStore.subscribe(() => {
  const { enabled, autoFade } = showTouchesStore.getState()
  if (enabled) storage.setItem(ENABLED_KEY, 'true')
  else storage.removeItem(ENABLED_KEY)
  if (autoFade) storage.removeItem(AUTO_FADE_KEY)
  else storage.setItem(AUTO_FADE_KEY, 'false')
})

export default showTouchesStore
