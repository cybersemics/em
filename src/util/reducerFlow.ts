import { State } from './initialState'
import { Nullable } from '../utilTypes'

type UnaryReducer = (state: State) => State

/**
 * Composes a list of reducers in order and merges the results.
 *
 * @param reducers      A list of unary reducers of type `oldState => newState`. Does not accept async reducers.
 * @param initialState
 */
export const reducerFlow = (reducers: Nullable<UnaryReducer>[]) => (initialState: State) =>
  reducers.reduce((state, reducer) => ({
    ...state,
    ...reducer ? reducer(state) : null,
  }), initialState)
