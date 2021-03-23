import * as functions from 'firebase-functions'
import algoliasearch from 'algoliasearch'
import * as cors from 'cors'

const ALGOLIA_ID = functions.config().algolia.app_id
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key
const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key
const ALGOLIA_INDEX_NAME = functions.config().algolia.index

const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY)
const index = client.initIndex(ALGOLIA_INDEX_NAME)

/** Initialize index and it's settings if index doesn't exist yet. */
const initializeIndex = async (): Promise<void> => {
  const exists = await index.exists()
  if (exists) console.log('[Algolia Index exists]')
  else {
    console.log('[Algolia Index doesn\'t exist]')
    // Set proper facets filters and searchable attributes
    await index.setSettings({
      searchableAttributes: ['value'],
      attributesForFaceting: ['filterOnly(userId)'],
    })

    console.log('[Algolia Index created]')
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
  .onDelete(async (snapshot, context) => {
    const { thoughtHash } = context.params
    try {
      await index.deleteObject(thoughtHash)
    }
    catch (err) {
      console.warn(err, 'index delete error')
    }
  })
