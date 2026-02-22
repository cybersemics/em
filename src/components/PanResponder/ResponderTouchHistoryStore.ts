/**
 * Minimal ResponderTouchHistoryStore implementation.
 * Tracks touch history for the responder system.
 */
import type { TouchHistory } from './CoreEventTypes'

interface TouchTrack {
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
}

/**
 * Tracks touch history for the responder system.
 */
class ResponderTouchHistoryStore {
  private touchBank: (TouchTrack | null)[] = new Array(20).fill(null)
  private numberActiveTouches = 0
  private indexOfSingleActiveTouch = -1
  private mostRecentTimeStamp = 0

  recordTouchTrack(key: number, touch: Touch): void {
    // Use touch identifier modulo touchBank size to prevent out-of-bounds
    // Touch identifiers are typically sequential and small, but this is safer
    const index = key % this.touchBank.length
    const timestamp = performance.now()
    const pageX = touch.pageX
    const pageY = touch.pageY

    const existingTrack = this.touchBank[index]
    if (existingTrack && existingTrack.touchActive) {
      // Update existing track - move current to previous
      existingTrack.previousPageX = existingTrack.currentPageX
      existingTrack.previousPageY = existingTrack.currentPageY
      existingTrack.previousTimeStamp = existingTrack.currentTimeStamp
      existingTrack.currentPageX = pageX
      existingTrack.currentPageY = pageY
      existingTrack.currentTimeStamp = timestamp
    } else {
      // Create new track
      this.touchBank[index] = {
        touchActive: true,
        startPageX: pageX,
        startPageY: pageY,
        startTimeStamp: timestamp,
        currentPageX: pageX,
        currentPageY: pageY,
        currentTimeStamp: timestamp,
        previousPageX: pageX,
        previousPageY: pageY,
        previousTimeStamp: timestamp,
      }
    }

    this.updateActiveTouchCounts()
    this.mostRecentTimeStamp = Math.max(this.mostRecentTimeStamp, timestamp)
  }

  removeTouchTrack(key: number): void {
    // Use touch identifier modulo touchBank size to prevent out-of-bounds
    const index = key % this.touchBank.length
    const track = this.touchBank[index]
    if (track) {
      track.touchActive = false
    }
    this.updateActiveTouchCounts()
  }

  private updateActiveTouchCounts(): void {
    let count = 0
    let singleIndex = -1

    for (let i = 0; i < this.touchBank.length; i++) {
      if (this.touchBank[i]?.touchActive) {
        count++
        if (singleIndex === -1) {
          singleIndex = i
        } else {
          singleIndex = -1 // Multiple touches
        }
      }
    }

    this.numberActiveTouches = count
    this.indexOfSingleActiveTouch = singleIndex
  }

  getTouchHistory(): TouchHistory {
    return {
      indexOfSingleActiveTouch: this.indexOfSingleActiveTouch,
      mostRecentTimeStamp: this.mostRecentTimeStamp,
      numberActiveTouches: this.numberActiveTouches,
      touchBank: this.touchBank.map(track =>
        track && track.touchActive
          ? {
              touchActive: track.touchActive,
              startPageX: track.startPageX,
              startPageY: track.startPageY,
              startTimeStamp: track.startTimeStamp,
              currentPageX: track.currentPageX,
              currentPageY: track.currentPageY,
              currentTimeStamp: track.currentTimeStamp,
              previousPageX: track.previousPageX,
              previousPageY: track.previousPageY,
              previousTimeStamp: track.previousTimeStamp,
            }
          : null,
      ) as readonly (TouchHistory['touchBank'][number] | null)[],
    }
  }

  reset(): void {
    this.touchBank.fill(null)
    this.numberActiveTouches = 0
    this.indexOfSingleActiveTouch = -1
    this.mostRecentTimeStamp = 0
  }
}

// Global singleton instance
const responderTouchHistoryStore = new ResponderTouchHistoryStore()

export default responderTouchHistoryStore
