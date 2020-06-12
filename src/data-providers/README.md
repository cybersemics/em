The Data Providers API provides a standard interface to define persistent storage and realtime syncing of thoughts. The following is the minimal interface required to define a data provider.

IN PROGRESS

```js
/** Fetches descendants of many contexts, returning them as a single ThoughtsInterface.
 *
 * @param contextMap
 * @param maxDepth    The maximum number of levels to traverse. Default: 100.
 */
export const getManyDescendants: 
  (contextMap: GenericObject<Path>, { maxDepth }) => Promise<ThoughtsInterface> 
```
