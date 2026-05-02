# Understanding the Data Model

## Data Types

### Thought

We describe **em** to users in terms of creating, editing, and organizing their thoughts.

`Thought` is the data type for a specific thought in the tree. Thoughts are stored in the Redux state as `state.thoughts.thoughtIndex`. Individual thoughts can be retrieved with the selector `getThoughtById`.

#### rank

The `rank` of a `Thought` is a `number` used to determine the thought's sort order among its siblings.

Ranks are unique within a single context. There is no relationship between ranks across contexts.

Ranks are relative; the absolute value does not matter. What matters is only if a rank is greater than or less than other ranks in the same context.

A new thought will be assigned a rank depending on where it is inserted:

- at the end of a context → rank of last thought + 1
- at the beginning of a context → rank of first thought - 1 (may be negative!)
- in the middle of a context → rank halfway between surrounding siblings (may be fractional!)

Negative ranks allow new thoughts to be efficiently inserted at the beginning of a context without having to modify the ranks of all other siblings. e.g. If a thought is placed before a thought with ranks `0`, it will be assigned a rank of `-1`.

Fractional ranks allow new thoughts to efficiently be inserted between any two siblings without having to modify the ranks of other siblings. e.g. If a thought is placed between thoughts with ranks `5` and `6`, it will be assigned a rank of `5.5`.

`importJSON` autoincrements the ranks of imported thoughts across contexts for efficiency and may result in different ranks that would be produced by manually adding the thoughts, but the *sibling-relative ordering* will be the same.

### Context

The word *context* refers to the ancestor path of a thought. e.g. `c` is in the *context* `a/b`:

```
- a
  - b
    - c
```

### Path

```ts
/** A sequence of thoughts from contiguous contexts. */
type Path = ThoughtId[]
```

e.g. `['kv9a-vzva-ac4n', '2mv0-atk3-tjlw', 'vkwt-ftz1-094z']` may represent the `Path` for `a/b/c`:

```
- a
  - b
    - c
  - d
```

A `Path` always starts at the ROOT thought. The ROOT thought is not part of the `Path` itself, but is implied as the starting point. i.e. The first id of a `Path` (e.g. `kv9a-vzva-ac4n`) is a child of the ROOT thought. The `Path` representing the ROOT thought itself is a special case defined as `[HOME_TOKEN]`.

An important `Path` in **em** is the thought that is being edited: `state.cursor`. When the user clicks on thought `A`, `state.cursor` will be set to `[idOfA]`. Navigating to a subthought will append the child's id to the `cursor`. So hitting `ArrowDown` on `A` will set the cursor to `[idOfA, idOfB]`, etc.

Circular `Paths` *are* allowed. This is possible because of the Context View, described below, which allows jumping across the [hierarchy](https://github.com/cybersemics/em/wiki/Glossary#hierarchy).

### SimplePath

```ts
/** A contiguous Path with no cycles. */
export type SimplePath = Path & Brand<'SimplePath'>
```

A `SimplePath` is a `Path` that has not crossed any Context Views, and thus has no cycles. Typescript is not expressive enough to capture this property in a type, but we can use *brand* types to require explicit casting, thus minimizing the chance of using a `Path` with cycles when a `SimplePath` is required. A Brand type is a nominal type that disallows implicit conversion. See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.

### Lexeme

```ts
/** An object that contains a list of contexts where a lexeme appears in
    different word forms (plural, different cases, emojis, etc). */
export interface Lexeme {
  contexts: ThoughtId[],
  created: Timestamp,
  lastUpdated: Timestamp,
  updatedBy: string
}
```

A `Lexeme` stores all the contexts where a thought appears in identical and near-identical word forms (ignoring case, plurality, emojis, etc). Lexemes are stored in `state.thoughts.lexemeIndex` and keyed by a hash of the thought value. Think of these as the inbound links to a thought.

e.g. The `Lexeme` for *cat* contains two contexts, `Animals` and `Socrates`:

```
- Animals
  - Cats
  - Dogs
- My Pets
  - Socrates
    - cat
```

**Usage Tip**: Use the `getLexeme` selector to get the `Lexeme` for a thought value.

## Working with the Data Types

There are several common selectors that are used to access a parent, child, or sibling of a thought. Consider the following thought structure:

```
- a
  - b
    - c
      - x
      - y
      - z
```

- To get the **parent** `Thought` of `Thought` `c`: `thoughtB ≅ getThoughtById(state, thoughtC.parentId)`. See: [getThoughtById](https://github.com/cybersemics/em/blob/main/src/selectors/getThoughtById.ts).
- To get the **parent** `Path` of `Path` `a/b/c`: `pathAB ≅ rootedParentOf(state, pathABC)`. See: [rootedParentOf](https://github.com/cybersemics/em/blob/main/src/selectors/rootedParentOf.ts).
  - Note: `rootedParentOf` always return a valid `Path`. If passed a child of the ROOT context, `rootedParentOf` returns `[HOME_TOKEN]`. If [parentOf](https://github.com/cybersemics/em/blob/main/src/util/parentOf.ts) is passed a child of the ROOT context, it returns an empty array, which is not a valid `Path`. `parentOf` should only be used if one or more additional thoughts are immediately appended, e.g. `appendToPath(parentOf(path), thoughtId)`. This is not currently reflected in the return type of `parentOf`.
- To get the **children** of `Thought` `c`: `childrenOfC ≅ getAllChildrenAsThoughtsById(state, thoughtC.id)`. If you have the `Context` of `c` rather than its ID, you can use: `childrenOfC ≅ getAllChildren(state, contextABC)`. See: [getChildren.ts](https://github.com/cybersemics/em/blob/main/src/selectors/getChildren.ts).
- To get the **next sibling** of `Thought` y: `thoughtZ ≅ nextSibling(state, 'y', contextABC)`. See: [nextSibling](https://github.com/cybersemics/em/blob/main/src/selectors/nextSibling).
- To get the **previous sibling** of `Thought` y: `thoughtX ≅ prevSibling(state, 'y', contextABC)`. See: [prevSibling](https://github.com/cybersemics/em/blob/main/src/selectors/prevSibling).

Those are just the most basic. There are many selectors and util functions which can be used to traverse, navigate, and convert between `Thought`, `ThoughtId`, `Context`, and `Path`:

- basic traversal
  - [parentOfThought](https://github.com/cybersemics/em/blob/main/src/selectors/parentOfThought.ts) - Returns the parent Thought of a given ThoughtId.
  - [nextSibling](https://github.com/cybersemics/em/blob/main/src/selectors/nextSibling.ts)/[prevSibling](https://github.com/cybersemics/em/blob/main/src/selectors/prevSibling.ts) - Gets the next/previous sibling of a thought, according to its parent's sort preference.
  - [rootedParentOf](https://github.com/cybersemics/em/blob/main/src/selectors/rootedParentOf.ts) - Gets the parent Context/Path of a given Context/Path. If passed a child of the root thought, returns `[HOME_TOKEN]` or `[ABSOLUTE_TOKEN]` as appropriate.
  - [parentOf](https://github.com/cybersemics/em/blob/main/src/util/parentOf.ts) - Gets the parent of a Context or Path. Use [rootedParentOf](https://github.com/cybersemics/em/blob/main/src/selectors/rootedParentOf.ts) instead unless you are immediately appending an additional thoughtnn
  - [appendToPath](https://github.com/cybersemics/em/blob/main/src/util/appendToPath.ts) - Appends one or more child nodes to a `Path` or SimplePath. Ensures the root thought is removed.
- children
  - [getChildren](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L73-L74) - Gets all visible children of a Context, unordered.
  - [getAllChildren](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L46-L50) - Returns the subthoughts (as ThoughtIds) of the given context unordered. If the subthoughts have not changed, returns the same object reference.
  - [getAllChildrenAsThoughts](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L38-L40) - Returns the subthoughts (as Thoughts) of the given context unordered.
  - [getAllChildrenAsThoughtsById](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L42-L44) - Returns the subthoughts (as Thoughts) of the given ThoughtId unordered.
  - [getAllChildrenSorted](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L76-L81) - Gets all children of a Context sorted by rank or sort preference.
  - [getChildrenRanked](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L162-L164) - Gets all children of a Context sorted by their ranking. Returns a new object reference even if the children have not changed.
  - [getChildrenRankedById](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L166-L171)  - Gets all children of a ThoughtId sorted by their ranking. Returns a new object reference even if the children have not changed.
  - [getChildrenSorted](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getChildren.ts#L83-L86) - Gets all visible children of a Context sorted by rank or sort preference.
- lookup/conversion
  - [getThoughtById](https://github.com/cybersemics/em/blob/main/src/selectors/getThoughtById.ts) - Gets a Thought by its ThoughtId.
  - [pathToThought](https://github.com/cybersemics/em/blob/main/src/selectors/pathToThought.ts) - Gets the head Thought of a path.
  - [pathToContext](https://github.com/cybersemics/em/blob/main/src/util/pathToContext.ts) - Converts a Path to a Context.
  - [contextToPath](https://github.com/cybersemics/em/blob/main/src/selectors/contextToPath.ts) - DEPRECATED: Converts a Context to a Path. This is a lossy function! If there is a duplicate thought in the same context, it takes the first. It should be removed. Build up the `Path` from information that is already in scope, or use [thoughtToPath](https://github.com/cybersemics/em/blob/main/src/selectors/thoughtToPath.ts) instead.
  - [thoughtToPath](https://github.com/cybersemics/em/blob/main/src/selectors/thoughtToPath.ts) - Generates the Path for a Thought by traversing upwards to the root thought.
  - [head](https://github.com/cybersemics/em/blob/main/src/util/head.ts) - Gets the last ThoughtId or value in a Path or Context.
  - [childIdsToThoughts](https://github.com/cybersemics/em/blob/main/src/selectors/childIdsToThoughts.ts) - Converts a list of ThoughtIds to a list of Thoughts. If any one of the thoughts are not found, returns null.
  - [thoughtToContext](https://github.com/cybersemics/em/blob/main/src/selectors/thoughtToContext.ts) - Generates the Context for a Thought by traversing upwards to the ROOT thought.
  - [contextToThought](https://github.com/cybersemics/em/blob/main/src/selectors/contextToThought.ts) - Gets the head Thought of a context.
  - [contextToThoughtId](https://github.com/cybersemics/em/blob/main/src/util/contextToThoughtId.ts) - Recursively finds the thought represented by the context and returns the id. This is the part of the independent migration strategy. Will likely be changed to some other name later.
  - [unroot](https://github.com/cybersemics/em/blob/main/src/util/unroot.ts) - Removes the root token from the beginning of a Context or Path.
- ancestors/descendants
  - [getAncestorBy](https://github.com/cybersemics/em/blob/main/src/selectors/getAncestorBy.ts) - Traverses the thought tree upwards from the given thought and returns the first ancestor that passes the check function.
  - [getDescendantContexts](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getDescendants.ts#L29-L44) - Generates a flat list of all descendant Contexts. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed.
  - [getDescendantThoughtIds](https://github.com/cybersemics/em/blob/ae4a381efe08316e2dbc4554a7c217b22103c70e/src/selectors/getDescendants.ts#L46-L70) - Generates a flat list of all descendant Paths. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed.
  - [ancestors](https://github.com/cybersemics/em/blob/main/src/util/ancestors.ts) - Returns a subpath of ancestor children up to the given thought (inclusive).
  - [isDescendant](https://github.com/cybersemics/em/blob/main/src/util/isDescendant.ts)
  - [isDescendantPath](https://github.com/cybersemics/em/blob/main/src/util/isDescendantPath.ts)
- predicates
  - [isHome](https://github.com/cybersemics/em/blob/main/src/util/isHome.ts) - Returns true if the Thoughts or Path is the home context.
  - [isRoot](https://github.com/cybersemics/em/blob/main/src/util/isRoot.ts) - Returns true if the Thoughts or Path is the one of the root contexts.
  - [hasChild](https://github.com/cybersemics/em/blob/main/src/selectors/hasChild.ts)
  - [hasLexeme](https://github.com/cybersemics/em/blob/main/src/selectors/hasLexeme.ts)
  - [equalPath](https://github.com/cybersemics/em/blob/main/src/util/equalPath.ts)
  - [equalThoughtRanked](https://github.com/cybersemics/em/blob/main/src/util/equalThoughtRanked.ts)
  - [equalThoughtSorted](https://github.com/cybersemics/em/blob/main/src/util/equalThoughtSorted.ts)
  - [equalThoughtValue](https://github.com/cybersemics/em/blob/main/src/util/equalThoughtValue.ts)
- attributes
  - [attribute](https://github.com/cybersemics/em/blob/main/src/selectors/attribute.ts)
  - [attributeEquals](https://github.com/cybersemics/em/blob/main/src/selectors/attributeEquals.ts)
- lexemes
  - [getLexeme](https://github.com/cybersemics/em/blob/main/src/selectors/getLexeme.ts) - Gets the Lexeme of a given value.
  - [getLexemeById](https://github.com/cybersemics/em/blob/main/src/selectors/getLexeme.ts) - Gets the Lexeme at the given lexemeIndex key.
  - [getContexts](https://github.com/cybersemics/em/blob/main/src/selectors/getContexts.ts) - Returns all of the Thoughts of a thought's Lexeme.
- context view
  - [appendChildToPath](https://github.com/cybersemics/em/blob/main/src/selectors/appendChildToPath.ts) - Appends the head of a child `SimplePath` to a parent `Path`. In case of a parent with an active context view, it appends the head of the parent of the childPath.
  - [getChildPath](https://github.com/cybersemics/em/blob/main/src/selectors/getChildPath.ts)
  - [simplifyPath](https://github.com/cybersemics/em/blob/main/src/selectors/simplifyPath.ts) - Infers the path from a path that may cross one or more context views.

## Views

### Normal View

In normal view (default), a thought's children are rendered in a collapsible tree.

```
- a
  - m [cursor]
    - x
    - y
- b
  - m
    - y
    - z
```

### Context View

Enter `Option + Shift + S`, or click the <img width="31" alt="Screen Shot 2020-03-27 at 7 09 58 AM" src="https://user-images.githubusercontent.com/750276/77759260-0edb9480-6ffa-11ea-8656-223550ff4a3f.png"> button in the toolbar to activate the Context View on a given thought. This will show all the contexts that a thought appears in.

e.g. Given a normal view...

```
- a
  - m
    - x
    - y
- b
  - m
    - y
    - z
```

Activating the context view on `m` (indicated by `~`) renders:

```
- a
  - m~ [cursor]
    - a
    - b
      - y
      - z
- b
  - m
    - y
    - z
```

`a` and `b` are listed under `a/m~` because they are the contexts that `m` appears in. They are the inbound links to `m`, as opposed to the outbound links that are rendered from a context to a child.

**Note**: The ranks of the contexts are autogenerated and do not correspond with the rank of the thought within its context, but rather the sorted order of the contexts in the context view.

**Usage Tip**: Use `getContexts()` or `getThought(...).contexts` to get the contexts for a thought value.

#### Context View Recursion

Descendants of contexts within a context view are rendered recursively. The `Child` thoughts that are generated from the list of contexts mentioned above can render their own `Child` thoughts (defaulting to Normal View). But what `Context` to use? When the parent is in Normal View, a `Path` is converted to a `Context`. When the parent, is in Context View, e.g. `['a', 'm']`, we have direct access to the `Context` not from a `Path` but from `getContexts('m')`: `[{ context: ['a'], rank: 0 }, { context: ['b'], rank: 1 }]`. We then combine the desired `Context` with the head thought to render the expected `Child` thoughts. See the following example.

**Note**: The `cursor` here is *circular*. The underlying data structure allows for cycles. This is possible because only a fixed number of levels of depth are shown at a time.

(`~` indicates context view)

```
- a
  - m~
    - a [cursor]
      - x
      - y
    - b
- b
  - m
    - y
    - z
```

The `ThoughtContexts` for `m` are `[{ context: ['a'], rank: 0 }, { context: ['b'], rank: 1 }]`. Where do `x` and `y` come from? They are the children of `['a', 'm']`. When the Context View of `m` is activated, and the context `['a']` is selected, it renders the children of `['a', 'm']`.

#### contextChain

When working with Context Views, it is necessary to switch between the full `Path` that crosses multiple Context Views, and the contiguous `SimplePath` segments that make it up. This is the only way to get from a `Path` that crosses multiple Context Views to a single `Context`, which does not allow cycles.

This more verbose and explicit representation of a transhierarchical `Path` and its different Context View boundaries is called a `contextChain`. `contextChain` is not stored in `state`, but derived from the `cursor` via `splitChain(state, cursor)`. Consider the following:

- a
  - m
    - x
- b
  - m
    - y

When `cursor` is `a/m~/b/y`, then `contextChain` is (ranks omitted for readability):

```js
[
  ['a', 'm'],
  ['b', 'y']
]
```

That is, the `cursor` consists of the initial segment `a/m`, then we enter the Context View of `m`, then `b/y`.

This allows the `cursor` to move across multiple Context Views. A more complicated example (copy and paste into **em** to test):

```
  - Books
    - Read
      - C. S. Peirce
        - Philosophical Writings
          - Three Categories
          - Philosophy of Math
          - Philosophy Logic
          - Semiotics
  - Personal
    - Influences
      - Gregory Bateson
      - Michael Polanyi
      - C. S. Peirce
  - Philosophy
    - Philosophy of Math
      - Statistical Inference
      - Probability as Potential
    - Philosophy of Science
    - Metaphysics
      - Sri Aurobindo
      - Forrest Landry
        - Potentiality
          - Probability as Potential
            - Potentiality vs Actuality
```

The cursor `/Books/Read/C.S. Peirce/Philosophical Writings/Philosophy of Math~/Philosophy/Probability as Potential~/Potentiality/Potentiality vs Actuality` spans two Context Views (`Philosophy of Math` and `Probability as Potential`), thus there are three segments in the `contextChain`:

```js
[
  ['Books', 'Read', 'C. S. Peirce', 'Philosophical Writings', 'Philosophy of Math'],
  ['Philosophy', 'Probability as Potential'],
  ['Potentiality', 'Potentiality vs Actuality'],
]
```

Other functions related to `contextChain` are:

- [chain](https://github.com/cybersemics/em/blob/main/src/selectors/chain.ts)
- [contextChainToPath](https://github.com/cybersemics/em/blob/main/src/util/contextChainToPath.ts)
- [lastThoughtsFromContextChain](https://github.com/cybersemics/em/blob/main/src/selectors/lastThoughtsFromContextChain.ts)
- [splitChain](https://github.com/cybersemics/em/blob/main/src/selectors/splitChain.ts)
- [thoughtsEditingFromChain](https://github.com/cybersemics/em/blob/main/src/selectors/thoughtsEditingFromChain.ts)
