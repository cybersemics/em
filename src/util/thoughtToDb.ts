import _ from 'lodash'
import Thought from '../@types/Thought'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'

/** Filter out the properties that should not be saved to thoughts in the database. */
const thoughtToDb = (thought: Thought): ThoughtWithChildren =>
  _.pick(thought, ['id', 'childrenMap', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value'])

export default thoughtToDb
