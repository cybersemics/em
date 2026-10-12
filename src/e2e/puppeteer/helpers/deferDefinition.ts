import { HTTPRequest } from 'puppeteer'
import { page } from '../session'

/** Holds the external Define Term response until the returned completion callback is called. Page isolation removes the interception after each test. */
const deferDefinition = async () => {
  await page.setRequestInterception(true)
  const request = new Promise<HTTPRequest>(resolve => {
    page.on('request', request => {
      if (!new URL(request.url()).pathname.endsWith('/defineTerm')) void request.continue()
      else if (request.method() === 'OPTIONS') {
        void request.respond({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } else resolve(request)
    })
  })

  return async () => {
    await (
      await request
    ).respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ definitions: ['A sample definition.'] }),
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export default deferDefinition
