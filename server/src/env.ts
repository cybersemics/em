/** Loads environment variables from .env and .env.<NODE_ENV>. */
import dotenv from 'dotenv'
import path from 'path'

const nodeEnv: string | undefined = process.env.NODE_ENV?.toLowerCase() || 'development'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (nodeEnv) {
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) })
  dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}.local`) })
}
