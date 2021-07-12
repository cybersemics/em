import { SortDirection } from '../@types'

/** Parse given sort direction string. */
export const parseSortDirection = (sortDirectionString: string): SortDirection => {
  if (sortDirectionString && !['Asc', 'Desc'].includes(sortDirectionString)) {
    throw new Error(`Unsupported sort direction: ${sortDirectionString}`)
  }
  return sortDirectionString as SortDirection
}
