import lastURL from '../lastURL'

describe('thoughts that contain a url', () => {
  // [input, extracted url]
  const cases: [string, string][] = [
    ['https://test.com', 'https://test.com'],
    ['test.com', 'test.com'],
    ['localhost:3000', 'localhost:3000'],
    ['See test.com', 'test.com'],
    ['https://test.com is a url', 'https://test.com'],
    ['go to https://test.com now', 'https://test.com'],
    ['Deep work https://calnewport.com/deep-work', 'https://calnewport.com/deep-work'],
    [
      'Read and make sense of https://github.com/cybersemics/em/blob/main/docs/import-pipeline.md',
      'https://github.com/cybersemics/em/blob/main/docs/import-pipeline.md',
    ],
    ['first.com then second.com', 'second.com'],
    ['first.com in the middle of second.com text', 'second.com'],
    ['Trailing whitespace https://test.com  ', 'https://test.com'],
    ['<b>See</b> <i>test.com</i>', 'test.com'],
    ['<span style="color: rgb(255, 255, 255);">https://test.com</span>', 'https://test.com'],
  ]

  cases.forEach(([input, url]) => {
    it(input, () => {
      expect(lastURL(input)).toBe(url)
    })
  })
})

describe('thoughts that do not contain a url', () => {
  const inputs = ['', 'hello world', 'contact test@test.com for help', 'e.g.', 'version 1.0']

  inputs.forEach(input => {
    it(input || '(empty string)', () => {
      expect(lastURL(input)).toBe(null)
    })
  })
})
