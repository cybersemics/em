/** The bullet style applied to a context's children via `=children/=bullet`. `null` represents the default filled bullet (no `=bullet` attribute). `Time` renders each bullet as a clock time derived from the list's start and step (see getBulletTime). */
type BulletStyle = 'None' | 'Ordered' | 'Alpha' | 'Time' | null

export default BulletStyle
