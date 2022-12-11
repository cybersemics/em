import store from '../stores/app'
import testTimer from './testTimer'

const fakeTimer = testTimer()

/** Calls store.dispatch with fake timers. */
const runDispatch = (async (...actions: Parameters<typeof store.dispatch>) => {
  fakeTimer.useFakeTimer()
  await store.dispatch(...actions)
  await fakeTimer.runAllAsync()
  fakeTimer.useRealTimer()
}) as typeof store.dispatch

export default runDispatch
