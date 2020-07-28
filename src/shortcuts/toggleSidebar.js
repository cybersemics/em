const toggleSidebarShortcut = {
  id: 'toggleSidebar',
  name: 'Toggle Recently Edited',
  keyboard: { alt: true, key: 'r' },
  hideFromInstructions: true,
  // eslint-disable-next-line
  exec: (dispatch, getState) => dispatch({ type: 'toggleSidebar', value: !getState().showSidebar })
}

export default toggleSidebarShortcut
