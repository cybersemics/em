/**
 * Composes a list of diff reducers in order. A diff reducer only returns the state that should change, not the whole state.
 *
 * @param reducers      A list of unary diff reducers of type `state => ({ ... })`.
 * @param initialState
 */
export const reducerFlow = (reducers: Function[]) => (initialState: any) =>
  reducers.reduce((state, reducer) => ({
    ...state,
    // merge initialState into reducer input but do not return in output
    ...reducer ? reducer({ ...initialState, ...state }) : null,
  }), {})
