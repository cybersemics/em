export const unHideParent = el => {
  const parentLi = el.closest('li.child')
  if (parentLi && parentLi.classList.contains('hidden')) {
    parentLi.className = parentLi.classList.remove('hidden')
  }
}
