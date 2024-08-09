import getCommandState from '../getCommandState'

it('empty thought', () => {
  expect(getCommandState('')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('bold thought', () => {
  expect(getCommandState('<b>text</b>')).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('italic thought', () => {
  expect(getCommandState('<i>text</i>')).toStrictEqual({
    bold: false,
    italic: true,
    underline: false,
    strikethrough: false,
  })
})

it('underline thought', () => {
  expect(getCommandState('<u>text</u>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: true,
    strikethrough: false,
  })
})

it('strikethrough thought', () => {
  expect(getCommandState('<strike>text</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: true,
  })
})

it('partially styled thought', () => {
  expect(getCommandState('<b>Bold</b><i>Italic</i><u>Underline</u><strike>strikethrough</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
})

it('fully styled thought', () => {
  expect(getCommandState('<b><i><u><strike>text</strike></u></i></b>')).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
  })
})
