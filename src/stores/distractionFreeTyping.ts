import _ from 'lodash'
import reactMinistore from './react-ministore'

/** Hides the toolbar and nav bar to allow for distraction-free typing on desktop. */
const store = reactMinistore<boolean>(false)
const distractionFreeTypingStore = {
  ...store,
  updateThrottled: _.throttle(store.update, 100, { leading: false }),
}

export default distractionFreeTypingStore
