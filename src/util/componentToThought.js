/** Convert a single url component to an thought */
export const componentToThought = component => window.decodeURIComponent(window.decodeURIComponent(component.replace(/~$/, '')))
