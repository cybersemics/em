import isE2E from '../isE2E'

// Navigator.webdriver is readonly so we probably cannot test the true path.
describe('isE2e', () => {
  it('should return false if webdriver is falsy', () => {
    expect(isE2E()).toBe(false)
  })
})
