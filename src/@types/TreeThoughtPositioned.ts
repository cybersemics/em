import TreeThought from './TreeThought'

/** 2nd Pass: A thought with position information after its height has been measured. */
type TreeThoughtPositioned = TreeThought & {
  cliff: number
  height: number
  hoverTargetEndMargin: number
  singleLineHeightWithCliff: number
  width?: number
  x: number
  y: number
}

export default TreeThoughtPositioned
