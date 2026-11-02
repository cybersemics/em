import Thunk from '../@types/Thunk'
import { importDataActionCreator } from '../actions/importData'
import contextToPathOrThrow from './contextToPathOrThrow'

type Payload = Omit<Parameters<typeof importDataActionCreator>[0], 'path'>

/** A Thunk that imports data at the first match of the given unranked path. Throws if the path does not resolve. */
const importDataAtFirstMatch =
  (pathUnranked: string[], payload: Payload): Thunk =>
  (dispatch, getState) => {
    const path = contextToPathOrThrow(getState(), pathUnranked, 'importDataAtFirstMatch')

    dispatch(importDataActionCreator({ ...payload, path }))
  }

export default importDataAtFirstMatch
