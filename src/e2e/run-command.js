
/* eslint-disable no-console */

const spawnd = require('child_process').spawn
const chalk = require('chalk')

/**
 * Run commands with proper logs.
 */
const runCommand = command => new Promise((resolve, reject) => {
  console.log(chalk.blue(`Executing ${command} ...`))

  const process = spawnd(command, { shell: true })

  process.stdout.on('data', data => {
    console.log(chalk.green(data))
  })

  process.stderr.on('data', data => {
    console.log(chalk.red(data))
  })

  process.on('error', err => {
    console.error(chalk.red(err))
  })

  process.on('close', code => {
    if (code === 0) resolve()
    else reject(new Error('Process exited'))
  })
})

module.exports = runCommand
