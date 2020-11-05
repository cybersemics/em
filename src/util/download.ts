import { MimeType } from '../types'

/** Download data to a file.
 * See https://stackoverflow.com/a/30832210/480608.
 */
export const download = (data: string, filename: string, type: MimeType = 'text/plain') => {
  const file = new Blob([data], { type })

  // IE10+
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(file, filename)
  }
  // Others
  else {
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 0)

  }
}
