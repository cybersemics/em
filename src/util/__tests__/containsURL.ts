import containsURL from '../containsURL'

describe('html that contains urls', () => {
  const strings = [
    '<span style=“background-color: black”>test.com</span>',
    '<span style="color: rgb(255, 255, 255);background-color: rgb(51, 51, 51);">https://test.com</span>',
    '<code>test.com</code>',
    '<code><i><b>test.com</b></i></code>',
    '<b>test.com</b>',
  ]

  strings.forEach(url => {
    it(url, () => {
      expect(containsURL(url)).toBe(true)
    })
  })
})
