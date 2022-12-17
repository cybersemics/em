import State from '../@types/State'
import theme from './theme'

const colors = {
  dark: {
    bg: 'rgba(0, 0, 0, 1)',
    bgOverlay80: 'rgba(0, 0, 0, 0.8)',
    black: 'rgba(0, 0, 0, 1)',
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    darkgray: 'rgba(17, 17, 17, 1)', // #111111
    fg85: 'rgba(217, 217, 217, 1)', // #d9d9d9
    fg: 'rgba(255, 255, 255, 1)',
    fgOverlay80: 'rgba(20, 20, 20, 0.8)',
    fgOverlay90: 'rgba(20, 20, 20, 0.9)',
    gray15: 'rgba(38, 38, 38, 1)', // #262626
    gray50: 'rgba(128, 128, 128, 1)', // #808080 (gray)
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9
    green: 'rgba(0, 214, 136, 1)', // #00d688
    highlight: 'rgba(173, 216, 230, 1)', // #add8e6 (lightblue)
    highlight2: 'rgba(155, 170, 220, 1)', // (slight variation on highlight color for alternating highlights)
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    red: 'rgba(255, 87, 61, 1)', // #ff573d
    vividHighlight: '#63c9ea',
    white: 'rgba(255, 255, 255, 1)',
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
  },
  light: {
    bg: 'rgba(255, 255, 255, 1)',
    bgOverlay80: 'rgba(0, 0, 0, 0.8)',
    black: 'rgba(0, 0, 0, 1)',
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    darkgray: 'rgba(17, 17, 17, 1)', // #111111
    fg85: 'rgba(39, 39, 39, 1)', // #272727
    fg: 'rgba(0, 0, 0, 1)',
    fgOverlay80: 'rgba(235, 235, 235, 0.8)',
    fgOverlay90: 'rgba(235, 235, 235, 0.9)',
    gray15: 'rgba(38, 38, 38, 1)', // #262626
    gray50: 'rgba(128, 128, 128, 1)', // #808080 (gray)
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9
    green: 'rgba(0, 214, 136, 1)', // #00d688
    highlight: 'rgba(65, 105, 225, 1)', // #4169e1 (royalblue)
    highlight2: 'rgba(155, 170, 220, 1)', // (slight variation on highlight color for alternating highlights)
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    red: 'rgba(255, 87, 61, 1)', // #ff573d
    white: 'rgba(255, 255, 255, 1)',
    vividHighlight: '#63c9ea',
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
  },
} as const

/** Returns the colors of the currently active theme. */
const themeColors = (state: State) => (theme(state) !== 'Light' ? colors.dark : colors.light)

export default themeColors
