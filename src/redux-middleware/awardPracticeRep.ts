import { ThunkMiddleware } from 'redux-thunk'
import CommandSuccess from '../@types/CommandSuccess'
import State from '../@types/State'
import { awardPracticeRepActionCreator as awardPracticeRep } from '../actions/awardPracticeRep'
import commandEmitter from '../stores/commandEmitter'

/** Listens for successful commands and dispatches only when the current pin earns a rep. */
const awardPracticeRepMiddleware: ThunkMiddleware<State> = ({ dispatch, getState }) => {
  commandEmitter.on('commandSucceeded', (outcome?: CommandSuccess) => {
    if (!outcome || (outcome.source !== 'keyboard' && outcome.source !== 'gesture')) return
    const { commandId } = outcome
    const learning = getState().learning
    if (learning.pinnedCommandId === commandId && learning.progress[commandId]) {
      dispatch(awardPracticeRep({ commandId }))
    }
  })

  return next => action => next(action)
}

export default awardPracticeRepMiddleware
