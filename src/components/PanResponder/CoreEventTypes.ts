/**
 * Copyright (c) Meta Platforms, Inc. And affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Type definitions for React Native event types.
 */

export interface SyntheticEvent<T> {
  readonly bubbles?: boolean
  readonly cancelable?: boolean
  readonly currentTarget: HTMLElement
  readonly defaultPrevented?: boolean
  readonly dispatchConfig: {
    readonly registrationName: string
  }
  readonly eventPhase?: number
  preventDefault: () => void
  isDefaultPrevented: () => boolean
  stopPropagation: () => void
  isPropagationStopped: () => boolean
  readonly isTrusted?: boolean
  readonly nativeEvent: T
  persist: () => void
  readonly target?: HTMLElement
  readonly timeStamp: number
  readonly type?: string
}

export interface TouchHistory {
  readonly indexOfSingleActiveTouch: number
  readonly mostRecentTimeStamp: number
  readonly numberActiveTouches: number
  readonly touchBank: readonly (Readonly<{
    touchActive: boolean
    startPageX: number
    startPageY: number
    startTimeStamp: number
    currentPageX: number
    currentPageY: number
    currentTimeStamp: number
    previousPageX: number
    previousPageY: number
    previousTimeStamp: number
  }> | null)[]
}

export interface ResponderSyntheticEvent<T> extends SyntheticEvent<T> {
  readonly touchHistory: TouchHistory
}

export interface NativeTouchEvent {
  // changedTouches and touches can be empty arrays to avoid infinite recursion in type checking
  readonly changedTouches: readonly NativeTouchEvent[]
  readonly force: number
  readonly identifier: number
  readonly locationX: number
  readonly locationY: number
  readonly pageX: number
  readonly pageY: number
  readonly target?: HTMLElement
  readonly timestamp: number
  readonly touches: readonly NativeTouchEvent[]
}

export type PressEvent = ResponderSyntheticEvent<NativeTouchEvent>

export type GestureResponderEvent = PressEvent
