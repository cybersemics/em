import storage from '../util/storage'
import reactMinistore from './react-ministore'

/** The localStorage key that remembers the setting on this device. Only stored while off, since on is the default. */
const STORAGE_KEY = 'showTouchesAutoFade'

/** Whether Show Touches fades each mark on its own, or keeps every mark of a touch on screen until the next touch starts. Device-local, like showTouchesStore. */
const showTouchesAutoFadeStore = reactMinistore<boolean>(storage.getItem(STORAGE_KEY) !== 'false')

showTouchesAutoFadeStore.subscribe(value =>
  value ? storage.removeItem(STORAGE_KEY) : storage.setItem(STORAGE_KEY, 'false'),
)

export default showTouchesAutoFadeStore
