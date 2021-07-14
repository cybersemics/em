import { Tree, Leaf, findTreeDescendants } from '../recentlyEditedTree'
import { timestamp } from '../timestamp'
import { hashContext } from '../hashContext'

it('Hide meta and ROOT thoughts for recently edited tree', () => {
  const tree: Tree = {
    a: {
      b: {
        leaf: true,
        lastUpdated: timestamp(),
        path: [
          {
            id: hashContext(['ola']),
            lastUpdated: timestamp(),
            value: 'ola',
            rank: 1,
          },
          {
            id: hashContext(['ola', 'amigo']),
            lastUpdated: timestamp(),
            value: 'amigo',
            rank: 2,
          },
        ],
      } as Leaf,
      c: {
        d: {
          path: [
            {
              id: hashContext(['ola']) as string,
              lastUpdated: timestamp(),
              value: 'ola',
              rank: 1,
            },
            {
              id: hashContext(['ola', '=hidden']) as string,
              lastUpdated: timestamp(),
              value: '=hidden',
              rank: 2,
            },
          ],
        } as Leaf,
      },
    },
  }

  // hide meta or ROOT recently edited thoughts if showHiddenThoughts is false
  expect(
    findTreeDescendants(tree, {
      startingPath: [],
    }),
  ).toHaveLength(1)

  // show meta or ROOT recently edited thoughts if showHiddenThoughts is true
  expect(
    findTreeDescendants(tree, {
      startingPath: [],
      showHiddenThoughts: true,
    }),
  ).toHaveLength(2)
})
