import app from './index'

const port = process.env.PORT ? +process.env.PORT : 3111

app.listen(port, () => {
  console.info(`AI server listening on http://localhost:${port}`)
})
