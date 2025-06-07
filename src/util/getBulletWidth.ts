/** Returns the bullet width based on fontSize. */
const getBulletWidth = (fontSize: number): number => 11 - (fontSize - 9) * 0.5

export default getBulletWidth
