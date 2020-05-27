/** Handles an unknown action by printing an error if it is not a @@ Redux action. Returns state as-is. */
const unknownAction = (state, action) => {
  if (!action.type.startsWith('@@')) {
    console.error('Unrecognized action:', action.type, action)
  }
  return state
}

export default unknownAction
