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
const toggleAttribute = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
) => {
  if (!path || (value == null && (values === null || values?.length === 0))) return state
  const _values = values || [value!]

  const isNullaryAttribute = _values.length === 1

  const exists = !isNullaryAttribute
    ? path && attributeEquals(state, head(path), _values[0], _values[1])
    : !path || findDescendant(state, head(path), _values[0])

  const idAttributeOld = path && findDescendant(state, head(path), _values[0])
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
                path,
                value: _values[0],
                rank: path ? getPrevRank(state, head(path)) : 0,
              })
          : null,

        // set attribute value
        !isNullaryAttribute
          ? (state: State) => {
              return setFirstSubthought(state, {
                path: attributePath,
                value: _values[1],
              })
            }
          : null,
      ])(state)
}

export default _.curryRight(toggleAttribute)
