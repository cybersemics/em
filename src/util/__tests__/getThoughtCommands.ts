import getThoughtCommands from '../getThoughtCommands'

it('empty thought', () => {
  expect(getThoughtCommands('')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('bold thought', () => {
  expect(getThoughtCommands('<b>text</b>')).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('italic thought', () => {
  expect(getThoughtCommands('<i>text</i>')).toStrictEqual({
    bold: false,
    italic: true,
    underline: false,
    strikethrough: false,
  })
})

it('underline thought', () => {
  expect(getThoughtCommands('<u>text</u>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: true,
    strikethrough: false,
  })
})

it('strikethrough thought', () => {
  expect(getThoughtCommands('<strike>text</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: true,
  })
})

it('partially styled thought', () => {
  expect(getThoughtCommands('<b>Bold</b><i>Italic</i><u>Underline</u><strike>strikethrough</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('fully styled thought', () => {
  expect(getThoughtCommands('<b><i><u><strike>text</strike></u></i></b>')).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
  })
})
