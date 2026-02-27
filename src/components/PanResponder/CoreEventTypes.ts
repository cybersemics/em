/**
 * Copyright (c) Meta Platforms, Inc. And affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Type definitions for React Native event types.
 * Updated to align with the original react-native-web responder system types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SyntheticEvent<T> {
  bubbles: boolean
  cancelable: boolean
  currentTarget: any
  defaultPrevented?: boolean | null
  dispatchConfig: {
    registrationName?: string
    phasedRegistrationNames?: {
      bubbled: string
      captured: string
    }
  }
  eventPhase?: number | null
  preventDefault: () => void
  isDefaultPrevented: () => boolean
  stopPropagation: () => void
  isPropagationStopped: () => boolean
  isTrusted?: boolean | null
  nativeEvent: T
  persist: () => void
  target?: any
  timeStamp: number
  type?: string
}

export interface TouchHistory {
  indexOfSingleActiveTouch: number
  mostRecentTimeStamp: number
  numberActiveTouches: number
  touchBank: ({
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
  } | null)[]
}

export interface ResponderSyntheticEvent<T> extends SyntheticEvent<T> {
  touchHistory: TouchHistory
}

export interface NativeTouchEvent {
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  changedTouches: any[]
  force: number
  identifier: number
  locationX: any
  locationY: any
  pageX: number
  pageY: number
  target?: any
  timestamp: number
  touches: any[]
  type?: string
}

export type PressEvent = ResponderSyntheticEvent<NativeTouchEvent>

export type GestureResponderEvent = PressEvent
