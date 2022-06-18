import Index from './IndexType'

// Do not define RecentlyEditedTree type until recentlyEditedTree.ts is typed
// interface RecentlyEditedLeaf {
//   leaf: true,
//   lastUpdated: Timestamp,
//   path: Path,
// }
// type RecentlyEditedTree = Index<RecentlyEditedTree> causes circular reference error
// eslint-disable-next-line @typescript-eslint/no-empty-interface
// export interface RecentlyEditedTree extends Index<RecentlyEditedTree> {}
type RecentlyEditedTree = Index

export default RecentlyEditedTree
