import { Path } from '../@types'

// TODO: Should path be converted to context here. No idea where this is being used.
/** Converts a path to a '.'-delimited key that can be passed to _.get. */
export const pathToIndex = (path: Path) => path.reduce((acc, value) => acc + '.' + value, '')
