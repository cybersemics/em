/* eslint-disable */

export default class DispatchTimer {
  /**
   * @classdesc Dispatch Timer takes a callback function and calls it after it reaches certain time threshold or after it is called manually using callbackAndClear method.
   */

  /**
   * @constructs DispatchTimer
   * @param {callback} function 
   * @param {number} thresholdTime time in milliseconds
   * @param {number} frequency time in milliseconds
   */
  constructor(callback = () => { }, thresholdTime = 200, frequency = 1) {
    this.frequency = frequency
    this.thresholdTime = thresholdTime
    this.time = 0
    this.callback = callback
    this.latestDispatchedData = null
  }

  /**
  * @param {object} dispatchData 
  * @description keeps the dispatchData in a variable and it is passed to callback function after thresholdTime
  */
  dispatch(dispatchData) {
    this.dispatchData = { ...dispatchData }
    this.time = 0
    if (!this.id) {
      this.startTimer()
    }
  }

  /**
  * @description just resets the time , doesn't stop it
  */
  resetTimer() {
    this.time = 0
  }

  /**
  * @description just resets the time and stops it
  */
  clearTimer() {
    this.time = 0
    this.id = clearInterval(this.id)
  }

  /**
   * @param {function} callback
   * @description used to dynamically set the callback function
   */
  setCallback(callback) {
    this.callback = callback
  }

  /**
  * @description it calls the callback function with the latest dispatch data and stops the timer
  */
  callbackAndClear() {
    if (this.dispatchData) {
      try {
        this.callback({ ...this.dispatchData })
      }
      catch (err) {
        console.warn('Dispatch Event missed!')
      }
      this.dispatchData = null
      this.latestDispatchedData = null
      this.clearTimer()
    }
  }

  /**
  * @description returns the latest dispatchData passed to the dispatchTimer using dispatch method
  */
  getDispatchData() {
    return this.dispatchData
  }

  /**
  * @description returns the dispatch data that have been passed to recent callback call
  */
  getLatestDispatchedData() {
    return this.latestDispatchedData
  }

  /**
  * @description it starts the timer function with provided frequency and threshold time
  */
  startTimer() {
    this.id = setInterval(() => {
      this.time = this.time + this.frequency
      if (this.time > this.thresholdTime) {
        if (this.dispatchData) {
          try {
            this.callback({ ...this.dispatchData })
          }
          catch (err) {
            console.warn('Dispatch Event missed!')
          }
          this.time = 0
          this.latestDispatchedData = { ...this.dispatchData }
          this.dispatchData = null
          this.clearTimer()
        }
      }
    }, this.frequency)
  }
}