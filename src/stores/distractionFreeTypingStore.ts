import _ from 'lodash'
import durations from '../util/durations'
import reactMinistore from './react-ministore'

/** Hides the toolbar and nav bar to allow for distraction-free typing on desktop. */
const store = reactMinistore<boolean>(false)

const distractionFreeTypingStore = {
  ...store,
  /** Updates the distractionFreeTyping store immediately. */
  update: (value: boolean) => {
    distractionFreeTypingStore.updateThrottled.cancel()
    store.update(value)
  },
  updateThrottled: _.throttle(store.update, durations.get('distractionFreeTypingThrottle'), { leading: false }),
}

export default distractionFreeTypingStore
