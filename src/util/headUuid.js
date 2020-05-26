import { head } from './head'

/** Returns the uuid of the last thought in a path. */
export const headUuid = path => head(path).uuid
