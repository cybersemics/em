import State from '../@types/State'
import colors from '../colors.config'
import theme from './theme'

/** Returns the colors of the currently active theme. */
const themeColors = (state: State) => (theme(state) !== 'Light' ? colors.dark : colors.light)

export default themeColors
