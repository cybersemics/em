/* eslint-disable import/prefer-default-export */
/**********************************************************************
 * Gesture-menu geometry — single source of truth
 *
 * Shared by GestureMenu / GestureMenuItem (which render at these sizes) and GestureContentBlur
 * (which derives the content-blur height arithmetically from the command count, no ResizeObserver).
 *
 * The blur height is APPROXIMATE by design: a *selected* command row is taller than a normal row
 * because it adds a wrapping description (see GestureMenuItem.tsx), which the formula does not model.
 * Keep these values authoritative — consumers must reference them rather than re-hardcoding literals.
 **********************************************************************/

/** Command label line height (fontSize 0.95rem × lineHeight 1em). */
export const GESTURE_MENU_ROW_LABEL_REM = 0.95

/** Vertical gap between command rows, in rem. */
export const GESTURE_MENU_ROW_GAP_REM = 1.2

/** Padding on one side of the menu content block, in rem. Vertical padding = 2× this. */
export const GESTURE_MENU_PADDING_REM = 2.25

/** Bottom tail below the last row (shared with the overlay's paddingBottom), in rem. */
export const GESTURE_MENU_BOTTOM_TAIL_REM = 11.111

/**
 * Header ("Gestures" label + divider + margin) above the command list, in rem.
 * Aggregate approximation of the header block; not sourced from a single literal.
 */
export const GESTURE_MENU_HEADER_REM = 4.0
