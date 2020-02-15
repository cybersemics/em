export const copyText = textToExport => dispatch => {
  dispatch({
    type: 'COPY_TEXT_TO_EXPORT_MODAL',
    textToExport
  })
}
