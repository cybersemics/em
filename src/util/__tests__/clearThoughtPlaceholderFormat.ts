import clearThoughtPlaceholderFormat from '../clearThoughtPlaceholderFormat'

it('maps whole-thought formatting to placeholder CSS variables', () => {
  const format = clearThoughtPlaceholderFormat(
    '<b><i><u><strike><code><font color="rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)">text</span></font></code></strike></u></i></b>',
  )

  expect(format).toStrictEqual({
    style: {
      '--placeholder-background-color': 'rgb(0, 0, 255)',
      '--placeholder-color': 'rgb(255, 0, 0)',
      '--placeholder-font-family': 'monospace',
      '--placeholder-font-style': 'italic',
      '--placeholder-font-weight': '700',
      '--placeholder-text-decoration': 'underline line-through',
    },
    backgroundColor: true,
    code: true,
    color: true,
    fontFamily: true,
    fontStyle: true,
    fontWeight: true,
    textDecoration: true,
  })
})

it('ignores partially formatted values', () => {
  expect(clearThoughtPlaceholderFormat('<b>bold</b> plain')).toBeNull()
})
