/** Loads environment variables from .env and .env.<NODE_ENV>. */
import path from 'path'

// import is not working in commonjs build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv')
const nodeEnv: string | undefined = process.env.NODE_ENV?.toLowerCase() || 'development'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (nodeEnv) {
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) })
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`) })
}
