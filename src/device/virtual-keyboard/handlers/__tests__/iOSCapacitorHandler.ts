import iOSCapacitorHandler from '../iOSCapacitorHandler'

// https://github.com/cybersemics/em/issues/4869
it('focuses the editable so WKWebView can keep the keyboard open after undo', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  expect(document.activeElement).not.toBe(editable)

  iOSCapacitorHandler.show!(editable)

  expect(document.activeElement).toBe(editable)
})
