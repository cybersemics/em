import clearThoughtPlaceholderFormat from '../clearThoughtPlaceholderFormat'

it('extracts whole-thought formatting for the placeholder', () => {
  const format = clearThoughtPlaceholderFormat(
    '<b><i><u><strike><code><font color="rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)">text</span></font></code></strike></u></i></b>',
  )

  expect(format).toStrictEqual({
    backColor: 'rgb(0, 0, 255)',
    bold: true,
    code: true,
    foreColor: 'rgb(255, 0, 0)',
    italic: true,
    strikethrough: true,
    underline: true,
  })
})

it('ignores partially formatted values', () => {
  expect(clearThoughtPlaceholderFormat('<b>bold</b> plain')).toBeNull()
})
