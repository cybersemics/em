import trailingURL from '../trailingURL'

describe('thoughts that end with a url', () => {
  // [input, extracted url]
  const cases: [string, string][] = [
    ['https://test.com', 'https://test.com'],
    ['test.com', 'test.com'],
    ['localhost:3000', 'localhost:3000'],
    ['See test.com', 'test.com'],
    ['Deep work https://calnewport.com/deep-work', 'https://calnewport.com/deep-work'],
    [
      'Read and make sense of https://github.com/cybersemics/em/blob/main/docs/import-pipeline.md',
      'https://github.com/cybersemics/em/blob/main/docs/import-pipeline.md',
    ],
    ['Trailing whitespace https://test.com  ', 'https://test.com'],
    ['<b>See</b> <i>test.com</i>', 'test.com'],
    ['<span style="color: rgb(255, 255, 255);">https://test.com</span>', 'https://test.com'],
  ]

  cases.forEach(([input, url]) => {
    it(input, () => {
      expect(trailingURL(input)).toBe(url)
    })
  })
})

describe('thoughts that do not end with a url', () => {
  const inputs = [
    '',
    'hello world',
    'https://test.com is a url',
    'go to https://test.com now',
    'contact test@test.com',
    'e.g.',
    'version 1.0',
  ]

  inputs.forEach(input => {
    it(input || '(empty string)', () => {
      expect(trailingURL(input)).toBe(null)
    })
  })
})
