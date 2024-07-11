import { execSync } from 'child_process'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

/* 
  This script is used to build the application with the premium version of RxDB.
  It does the following:
  1. Adds the VITE_USE_RXDB_PREMIUM environment variable to the process.
     This is used in the vite.config.ts file to setup the alias for the premium version of RxDB.
  2. Reads the access token from the .env.production.local file
  3. Adds the access token to the package.json file
  4. Installs the rxdb-premium library
  5. Builds the application
  6. Resets the package.json and yarn.lock files to their original state

  NOTE: After it finished, the rxdb-premium library will not be removed from the node_modules folder.
  This is to avoid having to reinstall it every time you want to build the application.
*/

dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') })

const SHOW_OUTPUT = false
const EXEC_SYNC_OPTIONS = {
  stdio: SHOW_OUTPUT ? 'inherit' : 'ignore',
}

let originalPackageJson = null
let originalYarnLock = null

function log(...messages) {
  console.log('build-premium ->', ...messages)
}

function close() {
  reset()
  process.exit()
}

function addRxBDPremiumVar() {
  process.env.VITE_USE_RXDB_PREMIUM = 'true'
}

function getYarnLock() {
  try {
    originalYarnLock = fs.readFileSync('yarn.lock', 'utf8')
  } catch (e) {
    log('Error reading yarn.lock')
    close()
  }
}

function getPackageJson() {
  try {
    originalPackageJson = fs.readFileSync('package.json', 'utf8')
    const packageJson = originalPackageJson ? JSON.parse(originalPackageJson) : {}

    if (!originalPackageJson) {
      log('package.json not found')
      close()
    }

    return packageJson
  } catch (e) {
    log('Error reading package.json')
    close()
  }
}

async function addRxDBAccessToken(packageJson) {
  const accessToken = process.env.RXDB_ACCESS_TOKEN

  if (!accessToken) {
    log('No access token found.')
    close()
  }

  // Add the access token to the package.json file
  const newPackageJson = {
    ...packageJson,
    accessTokens: {
      ...(packageJson.accessTokens || {}),
      'rxdb-premium': accessToken,
    },
  }
  fs.writeFileSync('package.json', JSON.stringify(newPackageJson, null, 2))
  log('Access token added to package.json')
}

function isRxDBPremiumInstalled() {
  try {
    fs.accessSync('node_modules/rxdb-premium', fs.constants.F_OK)
    return true
  } catch (e) {
    return false
  }
}

async function installRxDBPremiumLibrary(packageJson) {
  const rxdbVersion = packageJson.dependencies.rxdb
  if (!rxdbVersion) {
    log('No rxdb version found in package.json')
    close()
  }

  if (isRxDBPremiumInstalled()) {
    log('using existing rxdb-premium installation')
    return
  }

  const installCommand = `yarn add rxdb-premium@${rxdbVersion}`

  try {
    log('Installing rxdb-premium...')
    execSync(installCommand, EXEC_SYNC_OPTIONS)
    log('rxdb-premium installed')
  } catch (e) {
    log('Error installing rxdb-premium', e)
    close()
  }
}

function build() {
  log('Building...')
  execSync('npm run build', EXEC_SYNC_OPTIONS)
  log('Build completed!')
}

function reset() {
  originalYarnLock && resetYarnLock()
  originalPackageJson && resetPackageJson()
}

function resetYarnLock() {
  log('Resetting yarn.lock to original state...')
  fs.writeFileSync('yarn.lock', originalYarnLock)
  originalYarnLock = null
}

function resetPackageJson() {
  log('Resetting package.json to original state...')
  fs.writeFileSync('package.json', originalPackageJson)
  originalPackageJson = null
}

async function init() {
  addRxBDPremiumVar()
  const packageJson = getPackageJson()
  getYarnLock()
  await addRxDBAccessToken(packageJson)
  await installRxDBPremiumLibrary(packageJson)
  build()
  log('All done! You can find the build in the /dist folder.')
  close()
}

init()
