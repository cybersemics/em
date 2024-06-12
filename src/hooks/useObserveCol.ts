import { useCallback, useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import { DeepReadonly, RxCollection, RxDocument } from 'rxdb'

type Document<T> = DeepReadonly<RxDocument<T>>

/**
 * Subscribes to a rxdb collection, e.g. RxCollection<PermissionDocType>.
 * Performs shallow comparison between new and old state and only updates if shallow value has changed.
 */
const useObserveCol = <T>(rxCol: RxCollection<T>): Document<T>[] => {
  const [state, setState] = useState<Document<T>[]>([])

  const updateState = useCallback(async () => {
    const stateNew = await rxCol
      .find()
      .exec()
      .then(docs => docs.map(doc => doc.toJSON() as Document<T>))

    setState(stateOld => (!shallowEqual(stateNew, stateOld) ? stateNew : stateOld))
  }, [rxCol])

  useEffect(() => {
    updateState()

    const subscription = rxCol.$.subscribe(updateState)
    return () => {
      subscription.unsubscribe()
    }
  }, [rxCol, updateState])

  return state
}

export default useObserveCol
