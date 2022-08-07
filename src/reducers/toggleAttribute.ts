import { setAttribute } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import deleteThought from '../reducers/deleteThought'
import findDescendant from '../selectors/findDescendant'
import createId from '../util/createId'
import head from '../util/head'

/** Toggles the given attribute value. If the attribute value exists, deletes the entire attribute. If value is not specified, toggles the attribute itself. */
const toggleAttribute = (
  state: State,
  { path, value, values }: { path: Path | null; value?: string; values?: string[] },
) => {
  if (!path || (value == null && (!values || values.length === 0))) return state
  const _values = values || [value!]

  const exists = findDescendant(state, head(path), _values)

  const idAttributeOld = path && findDescendant(state, head(path), _values[0])
  const idAttribute = idAttributeOld || createId()

  return exists
    ? deleteThought(state, {
        pathParent: path,
        thoughtId: idAttribute,
      })
    : setAttribute(state, {
        path,
        values,
      })
}

export default _.curryRight(toggleAttribute)
