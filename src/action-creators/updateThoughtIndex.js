
export const updateThoughtIndex = ({ thoughtIndexUpdates = {}, contextIndexUpdates = {}, recentlyEdited, ignoreNullThoughts, forceRender }) => dispatch => {

  dispatch({
    type: 'thoughtIndex',
    thoughtIndexUpdates,
    contextIndexUpdates,
    recentlyEdited,
    ignoreNullThoughts,
    forceRender,
  })

}
