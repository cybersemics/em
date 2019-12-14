/** Convert a single url component to an item */
export const componentToItem = component => window.decodeURIComponent(component.replace(/~$/, ''))
