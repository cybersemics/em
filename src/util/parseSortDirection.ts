import SortDirection from '../@types/SortDirection'

/** Parse given sort direction string. */
const parseSortDirection = (sortDirectionString: string): SortDirection =>
  (sortDirectionString && ['Asc', 'Desc'].includes(sortDirectionString) ? sortDirectionString : 'Asc') as SortDirection

export default parseSortDirection
