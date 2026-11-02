/** Viewport breakpoints, shared by the PandaCSS config (which turns them into `breakpoints.*` tokens) and by runtime code that needs the raw widths. Defined here rather than read back with `token('breakpoints.x')` so that no `token()` call receives a dynamic argument. */
const breakpoints = {
  sm: '320px', // approx size of iPhone SE
  md: '400px', // approx size of iPhone 12 Pro
  lg: '600px', // landscape mobile devices and larger
  xl: '800px', // approx size of a laptop
  '2xl': '1000px', // approx size of a desktop
  '3xl': '1200px', // approx size of a large desktop
}

export default breakpoints
