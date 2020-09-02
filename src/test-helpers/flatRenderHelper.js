import { equalArrays, pathToContext } from '../util'

/** A filterWhere predicate that returns true for nodes that match the given context. */
const whereContext = context => node => equalArrays(pathToContext(node.props().item.thoughtsRanked), context) && node.props().item.phase !== 'leave'

/** A filterWhere predicate that returns true for nodes that match the given resolved context. */
const whereResolvedContext = context => node => equalArrays(pathToContext(node.props().item.thoughtsResolved), context) && node.props().item.phase !== 'leave'

/**
 * Find node by context.
 *
 * @param wrapper - ReactWrapper.
 * @param context - Context.
 */
export const findNodeByContext = (wrapper, context) => wrapper.find('TreeNode').filterWhere(whereContext(context))

/**
 * Find node by context.
 *
 * @param wrapper - ReactWrapper.
 * @param context - Context.
 */
export const findNodeByResolvedContext = (wrapper, context) => wrapper.find('TreeNode').filterWhere(whereResolvedContext(context))

/**
 * Find subthoughts of a node by key.
 *
 * @param wrapper - ReactWrapper.
 * @param key - Key of a node.
 */
export const findSubthoughtsByKey = (wrapper, key) => wrapper.find(`TreeNode`).filterWhere(node => node.props().item.parentKey === key && node.props().phase !== 'leave')
