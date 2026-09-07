import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { getChildrenSorted } from './getChildren'
import isTableCol2 from './isTableCol2'
import prevSibling from './prevSibling'
import rootedParentOf from './rootedParentOf'

/** Gets the previous thought at the same depth as a table view second-column (col2) thought, crossing col1 row boundaries (i.e. the previous "cousin"). Returns the previous cell within the same col1 row if it exists, otherwise the last col2 cell of the nearest preceding non-empty col1 row. Returns null if the path is not a col2 thought or there is no previous cousin. */
const prevTableCousin = (state: State, path: Path): Path | null => {
  if (!isTableCol2(state, path)) return null

  const parentPath = rootedParentOf(state, path)

  // the previous cell within the same col1 row
  const sibling = prevSibling(state, path)
  if (sibling) return appendToPath(parentPath, sibling.id)

  // otherwise, the last col2 cell of the nearest preceding non-empty col1 row
  const grandparentPath = rootedParentOf(state, parentPath)
  const rows = getChildrenSorted(state, head(grandparentPath))
  const rowIndex = rows.findIndex(row => row.id === head(parentPath))
  const prevRow = rows
    .slice(0, rowIndex)
    .reverse()
    .find(row => getChildrenSorted(state, row.id).length > 0)
  if (!prevRow) return null

  const cells = getChildrenSorted(state, prevRow.id)
  const lastCell = cells[cells.length - 1]
  return appendToPath(grandparentPath, prevRow.id, lastCell.id)
}

export default prevTableCousin
