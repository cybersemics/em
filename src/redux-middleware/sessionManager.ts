/** Updates the url history after the cursor has changed. The call to updateUrlHistory will short circuit if the cursor has not deviated from the current url. */
const updateUrlHistoryMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    // wait until local state has loaded before updating the url
    if (!getState().isLoading) {
      updateUrlHistoryDebounced(getState)
    }
  }
}

export default updateUrlHistoryMiddleware
