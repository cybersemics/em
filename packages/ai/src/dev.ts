import app from './index'

const port = 3111

app.listen(port, () => {
  console.info(`AI server listening on http://localhost:${port}`)
})
