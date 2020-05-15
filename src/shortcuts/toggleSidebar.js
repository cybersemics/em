export default {
  id: 'toggleSidebar',
  name: 'Toggle Recently Edited',
  keyboard: { alt: true, key: 'r' },
  hideFromInstructions: true,
  exec: (dispatch, getState) => dispatch({ type: 'toggleSidebar', value: !getState().showSidebar })
}
