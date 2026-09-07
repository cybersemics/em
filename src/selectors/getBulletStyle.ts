import BulletStyle from '../@types/BulletStyle'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attribute from './attribute'
import findDescendant from './findDescendant'

/** The set of recognized `=bullet` style values. */
const BULLET_STYLES: BulletStyle[] = ['None', 'Ordered', 'Alpha']

/**
 * Gets the bullet style applied to a context's children via `=children/=bullet`.
 * Returns `null` for the default filled bullet (no `=children/=bullet`, or an unrecognized value).
 */
const getBulletStyle = (state: State, id: ThoughtId | null): BulletStyle => {
  const childrenId = findDescendant(state, id, '=children')
  const value = attribute(state, childrenId, '=bullet')
  return (BULLET_STYLES as string[]).includes(value as string) ? (value as BulletStyle) : null
}

export default getBulletStyle
