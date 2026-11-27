import storage from '../util/storage'
import reactMinistore from './react-ministore'

/** The local storage key that remembers whether the switcher turned the Gesture Menu off. */
const STORAGE_KEY = 'gestureMenuSwitch'

/** Holds whether the Gesture Menu opens during a gesture. Demo-only: only GestureMenuSwitcher turns it off. */
const gestureMenuSwitchStore = reactMinistore<{ enabled: boolean }>({
  enabled: storage.getItem(STORAGE_KEY) !== 'off',
})

gestureMenuSwitchStore.subscribe(() => {
  if (gestureMenuSwitchStore.getState().enabled) storage.removeItem(STORAGE_KEY)
  else storage.setItem(STORAGE_KEY, 'off')
})

export default gestureMenuSwitchStore
