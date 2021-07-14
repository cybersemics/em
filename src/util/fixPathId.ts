import { Path } from '../@types'
import { hashContext } from './hashContext'
import { pathToContext } from './pathToContext'
import { unroot } from './unroot'

/**
 * Generates hashed context id for each child in path.
 * Child alone doesn't know in which context it will belong to. So we cannot add hashed context id to a child until its path is known. So using fixPathId to fix the child id all at once.
 */
export const fixPathId = (path: Path): Path =>
  path.map((child, i) => ({
    ...child,
    id: hashContext(unroot(pathToContext(path.slice(0, i + 1) as Path))),
  })) as unknown as Path
