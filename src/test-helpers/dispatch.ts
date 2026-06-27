import { act } from 'react'
import { UnknownAction } from 'redux'
import Thunk from '../@types/Thunk'
import store from '../stores/app'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'

/** Dispatches actions on the global store in an act block. */
const dispatch = async (args: Thunk[] | Thunk | UnknownAction) => {
  await act(async () => {
    store.dispatch(Array.isArray(args) ? args : [args])
    await waitForThoughtspaceIdle()
  })
}

export default dispatch
