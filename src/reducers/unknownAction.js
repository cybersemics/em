/** Handles an unknown action by throwing an error if it is not a @@ Redux action. */
const unknownAction = (state, action) => {
  if (!action.type.startsWith('@@')) {
    console.error('Unrecognized action:', action.type, action)
  }
  return state
}

export default unknownAction
