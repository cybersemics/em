import debounce from 'lodash.debounce'

const saveCurrentOffsetToLocalStorage = debounce(() => {
  const offset = window.getSelection().focusOffset
  localStorage.setItem('currentCursorPosition', offset)
}, 10)

export default function saveCurrentCursorOffset() {
  saveCurrentOffsetToLocalStorage()
}
