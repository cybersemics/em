/** Convert a single url component to an thought */
// user entered "~" characters are double encoded
export const componentToThought = component => window.decodeURIComponent(window.decodeURIComponent(component.replace(/~$/, '')))
