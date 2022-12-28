import _ from 'lodash'
import Thought from '../@types/Thought'
import ThoughtDb from '../@types/ThoughtDb'

/** Filter out the properties that should not be saved to thoughts in the database. */
const thoughtToDb = (thought: Thought): ThoughtDb =>
  _.pick(thought, ['id', 'childrenMap', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value'])

export default thoughtToDb
