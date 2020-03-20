import { store } from '../store'

// real time meta validation error. It is dispatched by Editable handlers and is used by Bullet and ThoughtsAnnotation to make visual changes.
export const setInvalidState = value =>
  store.getState().invalidState !== value
    ? store.dispatch({ type: 'invalidState', value })
    : null
