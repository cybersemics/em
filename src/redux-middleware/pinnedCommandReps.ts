import { ThunkMiddleware } from 'redux-thunk'
import CommandSuccess from '../@types/CommandSuccess'
import State from '../@types/State'
import { pinnedCommandAddRepActionCreator as pinnedCommandAddRep } from '../actions/pinnedCommandAddRep'
import commandEmitter from '../stores/commandEmitter'

/**
 * Adds a rep to the pinned command whenever the user performs it by keyboard or gesture.
 *
 * Unlike most middleware, this one never inspects or changes actions: every action passes straight through. It is a
 * middleware only because middleware is set up once with the store, which gives it `dispatch` and `getState`. It uses
 * them to subscribe to the command runner's `commandSucceeded` event, which keeps the command runner unaware of
 * pinned commands. It dispatches only when the rep will change Redux state, so other commands add no Redux action.
 */
const pinnedCommandRepsMiddleware: ThunkMiddleware<State> = ({ dispatch, getState }) => {
  commandEmitter.on('commandSucceeded', (outcome?: CommandSuccess) => {
    // Only reps the user performs count. Clicks, the toolbar, and programmatic calls do not.
    if (!outcome || (outcome.source !== 'keyboard' && outcome.source !== 'gesture')) return
    const { commandId } = outcome
    const learning = getState().learning
    // Only the pinned command earns reps, and only once pinning has created its progress record.
    if (learning.pinnedCommandId === commandId && learning.progress[commandId]) {
      dispatch(pinnedCommandAddRep({ commandId }))
    }
  })

  return next => action => next(action)
}

export default pinnedCommandRepsMiddleware
