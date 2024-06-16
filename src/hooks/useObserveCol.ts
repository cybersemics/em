import { useCallback, useEffect, useState } from 'react'
import { DeepReadonly, RxCollection, RxDocument } from 'rxdb'

type Document<T> = DeepReadonly<RxDocument<T>>

/**
 * Subscribes to a rxdb collection, e.g. RxCollection<PermissionDocType>.
 */
const useObserveCol = <T>(rxCol: RxCollection<T>): Document<T>[] => {
  const [state, setState] = useState<Document<T>[]>([])

  const updateState = useCallback(async (docs: RxDocument<T>[]) => {
    const stateNew = docs.map(doc => doc.toJSON() as Document<T>)
    setState(stateNew)
  }, [])

  useEffect(() => {
    const query = rxCol.find()
    const subscription = query.$.subscribe(updateState)
    return () => {
      subscription.unsubscribe()
    }
  }, [rxCol, updateState])

  return state
}

export default useObserveCol
