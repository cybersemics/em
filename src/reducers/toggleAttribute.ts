import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import createThought from '../reducers/createThought'
import deleteThought from '../reducers/deleteThought'
import setFirstSubthought from '../reducers/setFirstSubthought'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import createId from '../util/createId'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Toggles the given attribute value. If the attribute value exists, deletes the entire attribute. If value is not specified, just toggles the attribute itself. */
const toggleAttribute = (state: State, { path, key, value }: { path: Path | null; key: string; value?: string }) => {
  if (!path) return state

  const isNullaryAttribute = value === undefined

  const exists = !isNullaryAttribute
    ? path && attributeEquals(state, head(path), key, value!)
    : !path || findDescendant(state, head(path), key)

  const idAttributeOld = path && findDescendant(state, head(path), key)
  const idAttribute = idAttributeOld || createId()
  const attributePath = [...path!, idAttribute] as unknown as Path

  return exists
    ? // delete existing attribute
      deleteThought(state, {
        pathParent: path!,
        thoughtId: head(attributePath),
      })
    : // create new attribute
      reducerFlow([
        // create attribute if it does not exist
        !idAttributeOld
          ? state =>
              createThought(state, {
                id: idAttribute,
                path: path!, // ???
                value: key,
                rank: path ? getPrevRank(state, head(path)) : 0,
              })
          : null,

        // set attribute value
        !isNullaryAttribute
          ? (state: State) => {
              return setFirstSubthought(state, {
                path: attributePath,
                value: value!,
              })
            }
          : null,
      ])(state)
}

export default _.curryRight(toggleAttribute)
