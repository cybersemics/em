import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { getChildrenSorted } from './getChildren'
import isTableCol2 from './isTableCol2'
import nextSibling from './nextSibling'
import rootedParentOf from './rootedParentOf'

/** Gets the next thought at the same depth as a table view second-column (col2) thought, crossing col1 row boundaries (i.e. the next "cousin"). Returns the next cell within the same col1 row if it exists, otherwise the first col2 cell of the nearest following non-empty col1 row. Returns null if the path is not a col2 thought or there is no next cousin. */
const nextTableCousin = (state: State, path: Path): Path | null => {
  if (!isTableCol2(state, path)) return null

  const parentPath = rootedParentOf(state, path)

  // the next cell within the same col1 row
  const sibling = nextSibling(state, path)
  if (sibling) return appendToPath(parentPath, sibling.id)

  // otherwise, the first col2 cell of the nearest following non-empty col1 row
  const grandparentPath = rootedParentOf(state, parentPath)
  const rows = getChildrenSorted(state, head(grandparentPath))
  const rowIndex = rows.findIndex(row => row.id === head(parentPath))
  const nextRow = rows.slice(rowIndex + 1).find(row => getChildrenSorted(state, row.id).length > 0)
  if (!nextRow) return null

  const firstCell = getChildrenSorted(state, nextRow.id)[0]
  return appendToPath(grandparentPath, nextRow.id, firstCell.id)
}

export default nextTableCousin
