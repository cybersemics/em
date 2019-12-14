export const helperCleanup = () => {
  const helperContainer = document.querySelector('.helper-container')
  if (helperContainer) {
    helperContainer.classList.remove('helper-container')
  }
  document.querySelectorAll('.sibling-after').forEach(sibling => {
    sibling.classList.remove('sibling-after')
  })
}
