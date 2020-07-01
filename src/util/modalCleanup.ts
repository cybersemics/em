/** Does some manual DOM manipulation to clean up after modals. */
export const modalCleanup = () => {
  const modalContainer = document.querySelector('.modal-container')
  if (modalContainer) {
    modalContainer.classList.remove('modal-container')
  }
  document.querySelectorAll('.sibling-after').forEach(sibling => {
    sibling.classList.remove('sibling-after')
  })
}
