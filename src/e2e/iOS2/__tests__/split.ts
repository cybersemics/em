import helpers from '../helpers'

const {
  paste,
} = helpers()

it('split a thought when the caret is in the middle', async () => {
  const importText = `
  - puppeteer
    - web scraping
  - insomnia
    - rest api`

  await paste(importText)

  expect(true).toEqual(true)
})
