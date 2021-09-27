import { Theme } from '../themeProvider'

type ThemeSpecificStyle = Record<Theme['mode'], any>

/**
 * Styled component helper for theme specific styling.
 */
const themeSpecific = (themeSpecificStyle: ThemeSpecificStyle) => (props: { theme: Theme }) =>
  themeSpecificStyle[props.theme.mode]

export default themeSpecific
