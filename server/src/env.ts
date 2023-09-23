/** Loads environment variables from .env and .env.<NODE_ENV>. */
import path from 'path'

// import is not working in commonjs build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv')
const currentEnv: string | undefined = process.env.NODE_ENV?.toLowerCase()

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (currentEnv) {
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${currentEnv}`) })
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${currentEnv}.local`) })
}
