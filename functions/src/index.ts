import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import algoliasearch from 'algoliasearch'
import formData from 'form-data'
import Mailgun from 'mailgun.js'
import cors from 'cors'
import { FirebaseFunctionsRateLimiter } from 'firebase-functions-rate-limiter'
import { encode } from 'firebase-encode'
import { readFileSync } from 'fs'
import path from 'path'
import handlebar from 'handlebars'

admin.initializeApp()
const database = admin.database()

// Algolia search configs
const ALGOLIA_ID = functions.config().algolia.app_id
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key
const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key
const ALGOLIA_INDEX_NAME = functions.config().algolia.index

// Email api rate limiter configs
const LIMIT_MAX_CALLS = Number(functions.config().mailgun.rate_limit.max_calls)
const LIMIT_PERIOD = Number(functions.config().mailgun.rate_limit.period)

const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

const rateLimiter = FirebaseFunctionsRateLimiter.withRealtimeDbBackend(
  {
    name: 'ip_rate_limiter',
    maxCalls: LIMIT_MAX_CALLS,
    periodSeconds: LIMIT_PERIOD,
  },
  database
)

/** Initialize index and it's settings if index doesn't exist yet. */
const initializeIndex = async (): Promise<void> => {
  const exists = await index.exists()
  if (exists) console.log('[Algolia Index exists]')
  else {
    console.info('[Algolia Index doesn\'t exist]')
    // Set proper facets filters and searchable attributes
    await index.setSettings({
      searchableAttributes: ['value'],
      attributesForFaceting: ['filterOnly(userId)'],
    })

    console.info('[Algolia Index created]')
  }
}

/** Initialize on deployment. */
// eslint-disable-next-line @typescript-eslint/no-floating-promises
initializeIndex()

// Return secured api key that only shows results specific to the provided userId (firebase user uid).
export const getSearchKey = functions.https.onRequest((request, response) => {
  // TODO: Allow requests from specific origin in production
  cors({ origin: true })(request, response, () => {
    // firebase user uid
    const { userId } = request.body

    if (!userId) {
      response.status(400).json({
        message: 'userId is required',
      })
      return
    }

    const apiKey = client.generateSecuredApiKey(ALGOLIA_SEARCH_KEY, {
      restrictIndices: ALGOLIA_INDEX_NAME,
      filters: `userId:${userId}`,
    })

    response.json({
      apiKey,
    })
  })
})

export const addIndexOnCreateThoughtIndex = functions.database
  .ref('users/{userId}/thoughtIndex/{thoughtHash}')
  .onCreate(async (snapshot, context) => {
    // Note: Create separate shared types module to allow sharing between app and functions. Right now src/types.ts imports other dependencies which causes problem in the build.
    const lexeme = snapshot.val() as { value: string }
    const { userId, thoughtHash } = context.params
    try {
      await index.saveObject({
        thoughtHash,
        userId,
        value: lexeme.value,
      }, {
        autoGenerateObjectIDIfNotExist: true,
      })
    }
    catch (err) {
      console.warn(err, 'index add error')
    }
  })

export const deleteIndexOnThoughtIndexDelete = functions.database
  .ref('users/{userId}/thoughtIndex/{thoughtHash}')
  .onDelete(async (_, context) => {
    const { thoughtHash } = context.params
    try {
      await index.deleteObject(thoughtHash)
    }
    catch (err) {
      console.warn(err, 'index delete error')
    }
  })

// Sends feedback recieved from authenticated or anonymous user to the em support.
export const sendFeedbackEmail = functions.https.onRequest(async (request, response) =>
  // TODO: Allow requests from specific origin in production
  cors({ origin: true })(request, response, async () => {

    const { userId, feedback } = request.body

    if (!feedback) {
      response.status(400).json({
        message: 'Feedback is required.'
      })
      return
    }

    const ip = request.headers['x-appengine-user-ip'] || request.headers['x-forwarded-for'] || request.connection.remoteAddress

    // rate limit by ip address
    try {
      await rateLimiter.rejectOnQuotaExceededOrRecordUsage(encode(ip as string))
    }
    catch (err) {
      return response.status(429).json({
        message: 'Your feedback submission has been rate limited.'
      })
    }

    const getUserNameAndEmail = async () => {
      const userRef = database.ref(`users/${userId}`)
      const nameRef = userRef.child('name')
      const emailRef = userRef.child('email')

      const [nameSnapshot, emailSnapshot] = await Promise.all([nameRef.once('value'), emailRef.once('value')])

      return {
        name: nameSnapshot.val() as string,
        email: emailSnapshot.val() as string
      }
    }

    const feedbackTemplate = readFileSync(path.resolve(__dirname, 'templates', 'feedback.hbs')).toString('utf8')
    const template = handlebar.compile(feedbackTemplate)
    const userDetail = userId ? await getUserNameAndEmail() : null

    if (userId && userDetail && !userDetail.name) {
      response.status(400).json({
        message: 'User id is invalid.'
      })
      return
    }

    // Fix: type not working for FormData
    const mailgun = new Mailgun(formData as any)

    // mailgun configs
    const MAILGUN_API_KEY = functions.config().mailgun.api_key
    const MAILGUN_DOMAIN = functions.config().mailgun.domain
    const MAILGUN_FEEDBACK_EMAIL = functions.config().mailgun.feedback_email
    const MAILGUN_SUPPORT_EMAIL = functions.config().mailgun.em_support_email

    const mailgunClient = mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY,
    })

    try {
      await mailgunClient.messages.create(
        MAILGUN_DOMAIN,
        {
          from:
            `Em Feedback <${userDetail?.email ?? MAILGUN_FEEDBACK_EMAIL}>`,
          to: [MAILGUN_SUPPORT_EMAIL],
          subject: 'App Feedback',
          html: template({
            feedback,
            name: userDetail?.name ?? 'Anonymous User',
            email: userDetail?.email
          }),
        }
      )
    }
    catch (err) {
      console.error(err, 'Mailgun error')
      return response.status(500).json({
        message: 'Feedback could not be sent.'
      })
    }

    return response.json({
      message: 'Feedback sent successfully.',
    })
  })
)
