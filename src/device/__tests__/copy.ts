import copy from '../copy'

// These tests depend on their order. jsdom reports Apple as its vendor, so copy takes the Safari path and registers a
// capture-phase document copy listener that stays for a second. The first test leaves one registered, the second checks
// that it does not intercept an unrelated copy. https://github.com/cybersemics/em/issues/5251
describe('pending Safari copy', () => {
  it('registers a listener for the next copy event', () => {
    copy('a', { html: '<li>a</li>' })
  })

  it('does not intercept a copy event in a later test', () => {
    const event = new Event('copy', { bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
