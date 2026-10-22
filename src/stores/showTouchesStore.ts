import storage from '../util/storage'
import reactMinistore from './react-ministore'

/** The localStorage key that remembers the setting on this device. */
const STORAGE_KEY = 'showTouches'

/** Whether Show Touches draws touches on this device. Device-local, persisted to localStorage rather than synced through /EM/Settings: it is turned on to record one device, and should not start drawing on the account's other devices. */
const showTouchesStore = reactMinistore<boolean>(storage.getItem(STORAGE_KEY) === 'true')

showTouchesStore.subscribe(value => (value ? storage.setItem(STORAGE_KEY, 'true') : storage.removeItem(STORAGE_KEY)))

export default showTouchesStore
