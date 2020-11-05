#!/usr/bin/env node
'use strict'

/** Fails with exit code 1 if any of the given files exists. */

const fs = require('fs')
const path = require('path')

const files = process.argv.slice(2)
files.forEach(file => {
  if(fs.existsSync(path.resolve(file))) {
    console.error(`${file} is not allowed in this project.`)
    process.exit(1)
  }
})
