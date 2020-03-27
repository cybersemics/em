/** Convert a single url component to an thought */
export const componentToThought = component => window.decodeURIComponent(component.replace(/~$/, ''))
