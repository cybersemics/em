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
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
    green: 'rgba(0, 214, 136, 1)', // #00d688
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    red: 'rgba(255, 87, 61, 1)', // #ff573d
  },
  light: {
    bg: 'rgba(255, 255, 255, 1)',
    fg85: 'rgba(39, 39, 39, 1)', // #272727
    fg: 'rgba(0, 0, 0, 1)',
    gray50: 'rgba(128, 128, 128, 1)', // #808080
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    highlight: 'rgba(65, 105, 225, 1)', // #4169e1 (royalblue)
    overlay8: 'rgba(235, 235, 235, 0.8)',
    overlay10: 'rgba(235, 235, 235, 0.9)',
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
    green: 'rgba(0, 214, 136, 1)', // #00d688
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    red: 'rgba(255, 87, 61, 1)', // #ff573d
  },
} as const

/** Returns the colors of the currently active theme. */
const themeColors = (state: State) => (theme(state) !== 'Light' ? colors.dark : colors.light)

export default themeColors
