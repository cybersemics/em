import State from '../@types/State'
import theme from './theme'

const colors = {
  dark: {
    bg: 'rgba(0, 0, 0, 1)',
    fg85: 'rgba(217, 217, 217, 1)', // #d9d9d9
    fg: 'rgba(255, 255, 255, 1)',
    gray50: 'rgba(128, 128, 128, 1)', // #808080
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    highlight: 'rgba(173, 216, 230, 1)', // #add8e6 (lightblue)
    overlay8: 'rgba(20, 20, 20, 0.8)',
    overlay10: 'rgba(20, 20, 20, 0.9)',
  },
  light: {
    bg: 'rgba(255, 255, 255, 1)',
    fg85: 'rgba(39, 39, 39, 1)', // #272727
    fg: 'rgba(0, 0, 0, 1)',
    gray50: 'rgba(128, 128, 128, 1)', // #808080
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    highlight: 'rgba(65, 105, 225)', // #4169e1 (royalblue)
    overlay8: 'rgba(235, 235, 235, 0.8)',
    overlay10: 'rgba(235, 235, 235, 0.9)',
  },
} as const

/** Returns the colors of the currently active theme. */
const themeColors = (state: State) => (theme(state) !== 'Light' ? colors.dark : colors.light)

export default themeColors
