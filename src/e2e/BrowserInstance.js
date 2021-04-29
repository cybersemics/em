const puppeteer = require('puppeteer')

module.exports = puppeteer.launch({
  headless: false,
  devtools: true
})
