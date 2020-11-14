import { State } from './initialState'
import { Ref } from '../types'

/**
 * Get the user ref.
 */
export const getUserRef = (state: State): Ref => window.firebase.database().ref('users/' + state.user!.uid)
