import State from '../@types/State'
import theme from './theme'

const colors = {
  dark: {
    bg: '#000000',
    fg85: '#d9d9d9',
    fg: '#ffffff',
    gray50: '#808080',
    gray66: '#a9a9a9',
    highlight: '#add8e6', // lightblue
    overlay8: 'rgba(20, 20, 20, 0.8)',
    overlay10: 'rgba(20, 20, 20, 0.9)',
  },
  light: {
    bg: '#ffffff',
    fg85: '#272727',
    fg: '#000000',
    gray50: '#808080',
    gray66: '#a9a9a9',
    highlight: '#4169e1', // royalblue
    overlay8: 'rgba(235, 235, 235, 0.8)',
    overlay10: 'rgba(235, 235, 235, 0.9)',
  },
}

/** Returns the colors of the currently active theme. */
const themeColors = (state: State) => (theme(state) !== 'Light' ? colors.dark : colors.light)

export default themeColors
