import { act } from '@testing-library/react'
import { AnyAction } from 'redux'
import Thunk from '../@types/Thunk'
import store from '../stores/app'

/** Dispatches actions on the global store in an act block. */
const dispatch = async (args: Thunk[] | Thunk | AnyAction) => {
  await act(async () => {
    store.dispatch(Array.isArray(args) ? args : [args])
  })
}

export default dispatch
