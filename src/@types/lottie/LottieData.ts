import ShapeLayer from './ShapeLayer'

/**
 * LottieData Interface.
 *
 * The main interface for Lottie data, comprising multiple layers.
 */
interface LottieData {
  layers: ShapeLayer[] // Main layers array, which may contain various types
}

export default LottieData
