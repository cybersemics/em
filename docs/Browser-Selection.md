As **em** is a highly optimized custom editor, control of the browser selection or text cursor ("caret") is critical. This document defines consistent terminology and provides an overview of browser selection usage in the codebase.

# Browser Selection Terminology

- **Caret (or "text cursor")**: The vertical line in an input or editable element indicating that the user can type. While sometimes colloqially referred to as the "cursor", this term should be avoided as it is ambiguous.
- **Browser Selection**: When the user has selected text in an input or editable element, the browser selection has a start and end offset. When no text is selected, the browser selection is *collapsed*. That is, when no text is selected, the browser selection is just the caret.
- **Focus Node**: The DOM node that has the active selection. This is a TEXT_NODE when editing, but can also be an ELEMENT_NODE.
- **Offset**: If the focus node is a TEXT_NODE, then offset refers to the character offset of the caret. If the focus node is an ELEMENT_NODE, then offset is the index of the element before the caret. For example, offset: 1 on an ELEMENT_NODE means the caret is *after* the focus node. Thus, do not mistakenly assume the offset is always a character offset.
- **Cursor (or "cursor thought")**: The active thought that is being viewed or edited. Represented in the Redux store as `state.cursor`. Indicated in the UI by a gray circle around the thought's bullet. The cursor is the center of interactivity for the user. The user moves the cursor to navigate throughout their thoughtspace. All commands operate on the cursor or relative to the cursor. For example, when you activate Delete, it deletes the cursor thought. When you activate New Subthought, it creates a new thought beneath the cursor thought. Thoughts automatically expand and collapse, fade in and fade out, relative to the cursor.

# Philosophy

Browser selection can get incredibly tricky. There are many edge cases, and behavior can often be different on mobile where touch events are used instead of click events, the browser automatically scrolls to the selection, text can be selected with long tap, and more. Thus, there is no one-size-fits-all solution to handling browser selection. Nevertheless, every effort should be made to generalize solutions and avoid increasing complexity with many edge cases.

- Control the browser selection in a declarative manner when possible, i.e. defining a hook or middleware that can automatically set the selection when the right conditions are met.
- Avoid adding `setTimeout` to fix browser selection issues. This tends to increase complexity, decrease performance, and introduce more timing issues down the road.

# Edit Mode

In **em**, edit mode is true when the caret is on a thought and the virtual keyboard is up. Edit mode is only relevant on mobile. On desktop, edit mode is always enabled so it can basically be ignored.

Edit mode is represented in the Redux store by `state.editing`. 

Here's how edit mode works on mobile:

- By default, edit mode is false (the keyboard is down).
- When the user first taps a thought, the cursor moves to the thought but edit mode stays false. The keyboard stays down so that the user can see more thoughts while navigating.
- When the user taps a thought a second time (i.e. when the user taps the cursor thought), then edit mode is activated and the virtual keyboard comes up for editing.
- To close the keyboard and turn of edit mode, the user can hit "Done" on the virtual keyboard or tap on an empty area of the screen.

Setting the selection on the cursor thought to open the keyboard is handled in a custom hook, [useEditMode](https://github.com/cybersemics/em/blob/main/src/components/Editable/useEditMode.ts). This hook is used in each Editable component, though only the cursor thought will activate it at a given time. There are a variety of conditions that must be met for edit mode to be activated, such as the cursor thought being the same as the thought that was tapped, the thought being editable, no drag-and-drop in progress, etc.

**useEditMode is declarative and automatically sets the selection on the cursor thought when the conditions are correct. Thus, it should be preferred over manually setting the selection on the cursor thought.** That said, there are cases when the selection will not update automatically and needs to be manually set.

# Selection-Related Files

The following are important files in **em** with functionality related to the browser selection.

## asyncFocus.ts

https://github.com/cybersemics/em/blob/main/src/device/asyncFocus.ts


If there is no active selection, Mobile Safari will only allow programmatic selection within a click or touch event handler. Otherwise trying to focus or set the selection does nothing. To be able to set the selection in an asynchronous callback, you have to first set the selection to an arbitrary element in the initial click or touch handler. Then setting the selection will work. 

Import and call `asyncFocus()` before a command is activated, inside a click or touch handler, then the next asynchronous focus will work (including `useEditMode`).

## clearSelection.ts

https://github.com/cybersemics/em/blob/main/src/redux-middleware/clearSelection.ts

This Redux middleware is responsible for clearing the browser selection when the cursor is null or on a divider.

## selection.ts

https://github.com/cybersemics/em/blob/main/src/device/selection.ts

All direct access to `window.getSelection` and the native browser selection API functionality is contained in selection.ts. This is encapsulated in order to create a clean API for selection manipulation, and keep browser-specific implementation details separated. There is a lint rule that is set up to prevent direct access to `window.getSelection` in the rest of the codebase. Please do not disable it.

Get to know the methods available in selection.ts, and feel free to extend it if there is missing functionality.

## useEditMode.ts

https://github.com/cybersemics/em/blob/main/src/components/Editable/useEditMode.ts

See [Edit Mode](https://github.com/cybersemics/em/wiki/Browser-Selection#edit-mode) above.

# Testing

All browser selection testing should occur in puppeteer tests. 

In react-testing-library, the browser selection API is mocked in JSDOM, but cannot be relied on for realistic behavior.