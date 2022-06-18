import { RoamBlock, RoamPage } from './roamJsonToBlocks'

/**
 * Validates the strucutre of RoamBlocks.
 */
const isRoamBlock = (children: RoamBlock[] = []): boolean =>
  children.every(
    ({ uid, string, children = [], 'create-time': createTime, 'create-email': createEmail }: RoamBlock) =>
      Array.isArray(children) &&
      isRoamBlock(children) &&
      typeof uid === 'string' &&
      typeof string === 'string' &&
      typeof createTime === 'number' &&
      typeof createEmail === 'string',
  )

/**
 * Validates if a given string can be parsed as a Roam JSON.
 */
const validateRoam = (input: string) => {
  try {
    const json: RoamPage[] = JSON.parse(input)
    return json.every(
      ({ title, children }) => typeof title === 'string' && Array.isArray(children) && isRoamBlock(children),
    )
  } catch {
    return false
  }
}

export default validateRoam
