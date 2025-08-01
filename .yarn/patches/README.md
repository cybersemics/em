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
