import app from './index'

app.listen(Number(process.env.PORT || 3112), () =>
  console.info('Feedback service listening on port', process.env.PORT || 3112),
)
