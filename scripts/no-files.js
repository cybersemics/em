#!/usr/bin/env node

/** Fails with exit code 1 if any of the given files exists. */
import fs from 'fs'
import path from 'path'

;('use strict')

const files = process.argv.slice(2)
files.forEach(file => {
  if (fs.existsSync(path.resolve(file))) {
    console.error(`${file} is not allowed in this project.`)
    process.exit(1)
  }
})
