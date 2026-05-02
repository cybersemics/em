# Table of Contents

1. [Folder Structure](#1-folder-structure)
1. [Commands/Shortcuts](#2-commandsshortcuts)
1. [Understanding the Data Model](#3-understanding-the-data-model)
<br/>3.1 [Data Types](#31-data-types)
<br/>3.2 [Working with the Data Types](#32-working-with-the-data-types)
<br/>3.3 [Views](#33-views)
1. [Data Storage/Persistence](#4-data-storagepersistence)
1. [Metaprogramming](#5-metaprogramming)
1. [Cursor and Caret](#6-cursor-and-caret)
1. [Drag and Drop](#7-drag-and-drop)
2. [Layout Rendering Algorithm](#8-layout-rendering-algorithm)

# 1. Folder Structure

The main directory structure is organized as follows. Tests are located in a subdirectory named `__tests__` in in each directory.

- [`/src/App.css`](https://github.com/cybersemics/em/blob/main/src/App.css) - Legacy styles. New components should use inline styles.
- [`/src/actions`](https://github.com/cybersemics/em/tree/main/src/reducers) - Redux reducers and action-creators are co-located. Prefer reducers when possible, as they are pure functions that are more easily testable and composable. Only define an action creator if it requires a side effect. Use [util/reducerFlow](https://github.com/cybersemics/em/blob/main/src/util/__tests__/reducerFlow.ts) to compose reducers.
- [`/src/constants.ts`](https://github.com/cybersemics/em/blob/main/src/constants.ts) - Constant values. For constants that are only used in a single module, start by defining them in the module itself. They can be moved to `constants.js` if they need to be used in multiple modules or if there is a strong case to define them separately, e.g. an app-wide configuration that may need to be changed or tweaked.
- [`/src/components`](https://github.com/cybersemics/em/tree/main/src/components) - React components
- [`/src/hooks`](https://github.com/cybersemics/em/tree/main/src/hooks) - React hooks
- [`/src/redux-enhancers`](https://github.com/cybersemics/em/tree/main/src/redux-enhancers) - Redux enhancers
- [`/src/redux-middleware`](https://github.com/cybersemics/em/tree/main/src/redux-middleware) - Redux middleware
- [`/src/selectors`](https://github.com/cybersemics/em/tree/main/src/selectors) - Select, compute, and possibly memoize slices from the Redux state.
- [`/src/shortcuts`](https://github.com/cybersemics/em/tree/main/src/shortcuts) - Keyboard and gesture shortcuts
- [`/src/util`](https://github.com/cybersemics/em/tree/main/src/util) - Miscellaneous

# 2. Commands/Shortcuts

There are more than 50 commands within the app that are available to the user for editing, navigating, and other activities. Each can be activated with a toolbar button, keyboard shortcut, and/or gesture. The command palette brings up a list of all commands on desktop (Command/Ctrl + P). 

- Commands: https://github.com/cybersemics/em/wiki/Commands
- Source: https://github.com/cybersemics/em/tree/main/src/shortcuts

# 3. Understanding the Data Model

## 3.1. Data Types

### 3.1.0. Thought

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

### 3.1.1. Context

The word *context* refers to the ancestor path of a thought. e.g. `c` is in the *context* `a/b`:

```
- a
  - b
    - c
```

### 3.1.2. Path

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

### 3.1.3. SimplePath

```ts
/** A contiguous Path with no cycles. */
export type SimplePath = Path & Brand<'SimplePath'>
```

A `SimplePath` is a `Path` that has not crossed any Context Views, and thus has no cycles. Typescript is not expressive enough to capture this property in a type, but we can use *brand* types to require explicit casting, thus minimizing the chance of using a `Path` with cycles when a `SimplePath` is required. A Brand type is a nominal type that disallows implicit conversion. See: https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/.

### 3.1.4. Lexeme

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

## 3.2 Working with the Data Types

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

## 3.3. Views

### 3.3.1. Normal View

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

## 3.3.2. Context View

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

### 3.3.2.1. Context View Recursion

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

## 3.3.2.2. contextChain

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

# 4. Data Storage/Persistence

Thoughts are stored in the underlying objects `lexemeIndex` and `thoughtIndex`, which map hashed values to `Lexemes` and ids to `Thoughts`, respectively. Only visible thoughts are loaded into state. The `pullQueue` is responsible for loading additional thoughts into state that need to be rendered.

- state (Redux)
- local (IndexedDB via Dexie)
- remote (Firebase) [optional; if user is logged in]

The syncing and reconciliation logic is done by `pull`, `push`, `reconcile`, and `updateThoughts`. 

# 5. Metaprogramming

Metaprogramming provides the ability to alter **em**'s behavior from within **em** itself through hidden subthoughts called *metaprogramming attributes*. Metaprogramming attributes begin with `=` and are hidden unless `showHiddenThoughts` is toggled on from the toolbar. Generally an attribute will affect only its parent context.

**Note**: User settings are stored as metaprogramming thoughts within `[EM, 'Settings']`. See [INITIAL_SETTINGS](https://github.com/cybersemics/em/blob/main/src/constants.js#L168-L269) for defaults.

List of possible metaprogramming attributes:

- `=bullets` Hide the bullets of a context. Options: `Bullets`, `None`.
- `=children` Apply attributes to all children. Currently only works with `=style` and `=bullets`.
    e.g. This would make `b` and `c` the color `tomato`:
    ```
    - a
      - =children
        - =style
          - color
            - tomato
      - b
      - c
    ```
- `=focus` When the cursor is on this thought, hide parent and siblings for additional focus. Options: `Normal`, `Zoom`.
- `=hidden` The thought is only displayed when `showHiddenThoughts === true`.
- `=immovable` The thought cannot be moved.
- `=label` Display alternative text, but continue using the real text when linking contexts. Hide the real text unless editing.
- `=note` Display a note in smaller text underneath the thought.
- `=options` Specify a list of allowable subthoughts.
- `=pin` Keep a thought expanded. Options: `true`, `false`.
- `=pinChildren` Keep all thoughts within a context expanded. Options: `true`, `false`.
- `=readonly` The thought cannot be edited, moved, or extended.
- `=style` Set CSS styles on the thought. May also use `=children/=style` or `=grandchildren/=style`.
- `=uneditable` The thought cannot be edited.
- `=unextendable` New subthoughts may not be added to the thought.
- `=view` Controls how the thought and its subthoughts are displayed. Options: `List`, `Table`, `Prose`.

# 6. Cursor and Caret

More information: https://github.com/cybersemics/em/wiki/Browser-Selection

[TODO: Consolidate browser selection documentation]

## 6.1. Cursor

The cursor is a dark gray circle surrounding the bullet of the active thought. It is stored as a `Path` in `state.cursor`. Only one thought can have the cursor at a time. All shortcuts operate on the cursor thought or its children, so it serves as the main point of interaction for the user while editing. The cursor is **not** the browser selection (see below), however the cursor thought contains the browser selection (caret) while editing.

![image](https://user-images.githubusercontent.com/750276/151666504-8548ed98-515c-4894-856a-994af38203e0.png)

You can call `setCursor` to set `state.cursor`. `setCursor` does not set the browser selection, although it does maintain some state for the position of the caret in `caretOffset`.

## 6.2. Caret / Browser Selection

The caret is the native browser selection, i.e. `window.getSelection()`. We use the name "caret" because it is shorter, and is distinguishable from "cursor". Unless otherwise specified, the caret refers to a browser selection that is collapsed, i.e. no text is selected.

Caret position is set by `selection.set(...)`. This is typically handled automatically by the `Editable` component. Each `Editable` instance checks if the caret should be active on that thought when it is rendered. That is, it maintains the browser selection even when thoughts are re-rendered during navigation. There are [other checks](https://github.com/cybersemics/em/blob/8962a674749b0be57449af83a44573d533dff473/src/components/Editable.tsx#L395-L417) related to edit mode on mobile, drag-and-drop, etc. 

### 6.2.1. Desktop

On desktop, the caret is always on the cursor thought. 

### 6.2.1. Mobile

On mobile, the caret is only set when in edit mode. Otherwise the `cursor` changes without any browser selection. This allows the user to navigate thoughts without opening the virtual keyboard. Edit mode is stored in `state.editing`. When the user closes their mobile keyboard, `state.editing` is set to false.

- To enter `editing` mode, the user taps on the *cursor* thought or activates a shortcut that modifies a visible thought, such as `newThought`, `clearText`, `subcategorizeOne`, etc.
- Tapping on a non-cursor thought while not in edit mode will not activate edit mode.
- To close `editing` mode, the user closes the virtual keyboard or navigates to the root.

# 7. Drag and drop

em uses the [react-dnd](https://github.com/react-dnd/react-dnd) library for drag-and-drop functionality.

There there a variety of components that utilize drag-and-drop.

## Toolbar

[DragAndDropToolbarButton](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropToolbarButton.tsx) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a toolbar button when customizing the toolbar.

https://github.com/cybersemics/em/assets/750276/4950d843-1a12-4647-a511-5625def7311c

## Thoughts

[DragAndDropThought](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropThought.tsx) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought. Used by the `Thought` component so that every thought can be dragged, and every thought can serve as a drop target (inserted before, i.e. as the previous sibling).

https://github.com/cybersemics/em/assets/750276/2d6c967c-8cb6-484e-ad66-9cc50cfdd35d

[DropChild](https://github.com/cybersemics/em/blob/main/src/components/DropChild.tsx) - Allows a thought to be dropped as a subthought of a thought that is empty or collapsed.

https://github.com/cybersemics/em/assets/750276/93ff603d-31fa-409c-baa4-5c6dabe5887c

[DropEnd](https://github.com/cybersemics/em/blob/main/src/components/DropEnd.tsx) - Allows a thought to be dropped at the end of a list of subthoughts.

https://github.com/cybersemics/em/assets/750276/4f2049b3-1599-4ada-a203-c7ebb0941240

Many DropEnd components can be rendered consecutively when there is a cliff, i.e. the depth decreases by more than 1:

https://github.com/cybersemics/em/assets/750276/5127e543-26d7-434e-8166-d6f26e4424e1

[DropUncle](https://github.com/cybersemics/em/blob/main/src/components/DropUncle.tsx) - Allows a thought to be dropped before the next hidden uncle. For example, in the video below, the thought `c` is dragged onto a `DropUncle` drop target that allows the user to drop the thought before the next hidden uncle `e` (after the hidden parent `a`).

https://github.com/cybersemics/em/assets/750276/4f6b0fec-c230-46a1-acfa-40932160ac62

[Favorites](https://github.com/cybersemics/em/blob/main/src/components/Favorites.tsx) (also contains a drop target) - Defines `canDrag`, `beginDrag`, `endDrag`, `canDrop` and `drop` for dragging or dropping a thought within the favorites panel.

https://github.com/cybersemics/em/assets/750276/6f631b27-738b-4716-8bb0-8f73bcd23836

## Quick drops

These drop targets slide out from the right side of the screen as soon as a drag begins, providing an alternative means of executing a command on a thought.

[QuickDropIcon](https://github.com/cybersemics/em/blob/main/src/components/QuickDropIcon.tsx) 

https://github.com/cybersemics/em/assets/750276/0f94caa1-db57-4d2b-b732-4a96d2779cd3

- [DeleteDrop](https://github.com/cybersemics/em/blob/main/src/components/DeleteDrop.tsx) 
- [CopyOneDrop](https://github.com/cybersemics/em/blob/main/src/components/CopyOneDrop.tsx) 
- [ExportDrop](https://github.com/cybersemics/em/blob/main/src/components/ExportDrop.tsx) 

## Drag-and-drop helper components

[DragAndDropContext](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropContext.tsx) - Provide drag-and-drop context to the entire component hierarchy.

[DragOnly](https://github.com/cybersemics/em/blob/main/src/components/DragOnly.tsx) - A container fragment that only renders its children when `state.dragInProgress` is true. Strictly performance related. Useful for short circuiting child components with expensive selectors.

[DropHover](https://github.com/cybersemics/em/blob/main/src/components/DropHover.tsx) - Renders a blue bar at the insertion point when a valid drop target is being hovered over.

[DragAndDropSubthoughts](https://github.com/cybersemics/em/blob/main/src/components/DragAndDropSubthoughts.tsx) - Defines `canDrop` and `drop` for dropping a thought as a subthought (i.e. child). Used by `DropChild` and `DropEnd` since they both involve dropping a thought as a subthought.

## react-dnd patches

We have patched `react-dnd-touch-backend` multiple times already, and in order to create a new patch, you must specify the correct candidate package.

```
$ yarn patch -u react-dnd-touch-backend
Usage Error: Multiple candidate packages found; explicitly choose one of them (use `yarn why <package>` to get more information as to who depends on them):

- react-dnd-touch-backend@patch:react-dnd-touch-backend@npm%3A16.0.1#~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch::version=16.0.1&hash=77964d
- react-dnd-touch-backend@patch:react-dnd-touch-backend@patch%3Areact-dnd-touch-backend@npm%253A16.0.1%23~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch%3A%3Aversion=16.0.1&hash=77964d#~/.yarn/patches/react-dnd-touch-backend-patch-0040823149.patch::version=16.0.1&hash=33fdd5
```

Specifying the candidate package involves copying the name of the last one in the list, and then pasting it in single quotes:

```
yarn patch -u 'react-dnd-touch-backend@patch:react-dnd-touch-backend@patch%3Areact-dnd-touch-backend@npm%253A16.0.1%23~/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch%3A%3Aversion=16.0.1&hash=77964d#~/.yarn/patches/react-dnd-touch-backend-patch-0040823149.patch::version=16.0.1&hash=33fdd5'
```

A description of the existing patches follows:

### react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch

This first patch is the result of two separate efforts that were undertaken at different times but were combined into a single patch.

The first patch is the result of https://github.com/react-dnd/react-dnd/pull/3664 and provided a fix for an issue where tapping twice in quick succession would be seen as a single tap by `react-dnd-touch-backend`.

Next came https://github.com/cybersemics/em/pull/3119, which made more extensive changes in order to prevent race conditions between the timer running in `react-dnd-touch-backend` that controlled drag-and-drop behavior, and a separate timer running in `useLongPress` that controlled long press behavior.

To summarize, in chronological order rather than in the order that the changes appear in the source file:

1. [Don't cancel a pending drag](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L82) if `touchmove` events are less than the distance defined in `this.options.touchSlop`. Logic was moved up from [later in the function](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L106) and copied from other functions where `touchSlop` was already being respected.

2. Reset [\_mouseClientOffset](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L119) when a touch ends. This was previously only happening if drag-and-drop had begun, which was throwing off the distance calculation above.

3. Emit a custom [dragStart](https://github.com/cybersemics/em/blob/799c7fab0ec28c1270ce95366e869f7d48fac890/.yarn/patches/react-dnd-touch-backend-npm-16.0.1-2b96ba84be.patch#L73) event that can be consumed by event handlers. This change allows us to remove the competing timer in `useLongPress`, which could never be properly synced with the timer in `TouchBackendImpl`.

### react-dnd-touch-backend-patch-0040823149.patch

This patch is a result of https://github.com/cybersemics/em/pull/3138 and patches another edge case where `clearTimeout` is not called and multiple quick taps are interpreted as a single tap.

# 8. Layout Rendering Algorithm

Rather than rely on the hierarchy of the DOM, thoughts are rendered as a flat list of siblings, and are absolutely positioned to create a visual hierarchy. This allows smooth animation of thoughts across levels between any arbitrary states.

The rendering algorithm is contained in the [TreeLayout](https://github.com/cybersemics/em/blob/main/src/components/LayoutTree.tsx) component.

Each rendering of the tree generates two lists of nodes:

1. `treeThoughts` - The `LayoutTree` does an in-order traversal of the thought tree from the Redux state, generating a linear sequence of all visible thoughts from top to bottom. Each `TreeThought` includes metadata such as depth, whether it has any children, if it's in a table view, etc, that are needed to render the thought. It is recalculated whenever the Redux state changes. 
2. `treeThoughtsPositioned` - Next, the x,y coordinate are calculated for each visible thought. The accumulated y value is incremented by the height of each thought so that the next thought is rendered in the correct position. When the depth increases, the x value is increased (indent), and when the depth decreases, the x value is decreased (outdent). This list is recalculated whenever the width or height of a thought changes.

Thoughts are rendered in two passes:

- The **first render** positions all thoughts with an estimated height based on the current font size.
- Next, the VirtualThought component measures each thought's height in a layout effect and passes it up to the `LayoutTree` via `onResize`. If any of the heights differ from their original estimate, a re-render is triggered.
- The **second render** recalculates `treeThoughtsPositioned` with each thought's measured height. Any updates to thought y coordinates are smoothly animated into place via a CSS transition.

# LayoutTree Documentation

[In progress]

```
linearizeTree

useSizeTracking ->
  useSingleLineHeight
  useTreeThoughtsPositioned
  useAutofocusViewport <- useNavAndFooterHeight

div - vertical (instant)
  div - horizontal (slow)
    for each node
      div - absolutely positioned for animating across levels
        VirtualThought
        DropCliff
```

## Table View

The table view is rendered within the same algorithm, with some differences to how the x,y coordinates are calculated.

Take the following table:

```
- a
  - =view
    - Table
  - b
    - b1
    - b2
  - c
    - d
      - e
```

In the first step (`treeThoughts`), properties are added for each node that is part of a table.

e.g.
- `isTable`: a
- `isTableCol1`: b, c
- `isTableCol2`: b1, b2, d
- `isTableCol2Child`: e

In the second step (`treeThoughtsPositioned`), the x,y coordinates are generated for each thought.

- After col1 is rendered (e.g. `b`), the x coordinate is incremented by the thought's width, and the y coordinate is held at the same value, so that col2 is rendered to the right of col1 (e.g. `b1`).
- Additional thoughts in col2 (e.g. `b2`) are rendered one after another just like a normal list of thoughts.
- The next thought in col1 (e.g. `c`) is rendered at the x coordinate of its previous sibling and a y coordinate that clears the height of both columns in the previous row (e.g. `max(b, b1 + b2)`).

To support nested thoughts, the width of col1 thoughts are accumulated in `tableCol1Widths` so that deeper thoughts can be rendered at a deeper x coordinate. In combination with `ycol1Ancestors`, which stores the depth and y coordinate of col1 thoughts, this allows any level of nesting, including nested tables.

Lastly, the the entire tree is shifted left as the cursor moves deeper. Combined with the autofocus functionality which fades out ancestors the deeper the user moves, this allows the user to navigate throughout their thoughtspace while keeping the cursor and nearby thoughts front and center. The variables `indentDepth` and `indentCursorAncestorTables` are used to calculate how much the tree is shifted left. 