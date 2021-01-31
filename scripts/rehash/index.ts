import fs from 'fs'
import { hashThought } from '../../src/util/hashThought'

const main = () => {

  const [,,command, inputPath] = process.argv

  if (process.argv.length <= 2) {
    console.log('Usage:\n')
    console.log('  npm run start -- contexts input.json')
    console.log('  npm run start -- thoughts input.json')
    console.log('')
    process.exit(0)
  }

  if (!inputPath) {
    console.error('Please specify a JSON data file. You can export it from /users/USER_ID in Firebase.')
    process.exit(1)
  }

  console.info('Reading ' + inputPath)
  const input = fs.readFileSync(inputPath, 'utf-8')
  const state = JSON.parse(input)
  // const ext = path.extname(inputPath)
  // const outputPath = inputPath.replace(ext, '') + '-with-contexts' + ext
  // console.info('Writing ' + outputPath)
  // fs.writeFileSync(outputPath, JSON.stringify(state, null, 2))
  // console.info('Done')
}

main()
