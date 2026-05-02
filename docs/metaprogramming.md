# Metaprogramming

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
