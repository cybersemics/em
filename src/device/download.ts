import MimeType from '../@types/MimeType'

/** Download data to a file.
 * See https://stackoverflow.com/a/30832210/480608.
 */
const download = (data: string, filename: string, type: MimeType = 'text/plain') => {
  const file = new Blob([data], { type })

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

export default download
