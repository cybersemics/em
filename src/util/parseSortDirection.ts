import SortDirection from '../@types/SortDirection'

/** Parse given sort direction string. */
const parseSortDirection = (sortDirectionString: string): SortDirection => {
  if (sortDirectionString && !['Asc', 'Desc'].includes(sortDirectionString)) {
    throw new Error(`Unsupported sort direction: ${sortDirectionString}`)
  }
  return sortDirectionString as SortDirection
}

export default parseSortDirection
