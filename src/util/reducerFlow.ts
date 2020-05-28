/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`.
 * @param initialState
 */
export const reducerFlow = (reducers: Function[]) => (initialState: any) =>
  reducers.reduce((state, reducer) => ({
    ...state,
    ...reducer ? reducer(state) : null,
  }), initialState)
