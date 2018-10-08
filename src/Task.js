import { TASK_CANCEL } from './symbols'
import { deferred } from './utils'
import ForkQueue from './ForkQueue'

export default class Task {
  isRunning = true
  isCancelled = false
  isAborted = false
  result = undefined
  error = undefined
  joiners = []

  _deferredEnd = null

  // cont will be set after calling constructor()
  cont = undefined

  constructor(mainTask, taskContext) {
    this.taskQueue = new ForkQueue(mainTask)
    this.taskQueue.cont = this.end
    this.taskContext = taskContext
  }

  cancel = () => {
    if (this.isRunning && !this.isCancelled) {
      this.isCancelled = true
      this.taskQueue.cancelAll()
      this.end(TASK_CANCEL)
    }
  }

  end = (result, isErr) => {
    this.isRunning = false
    if (!isErr) {
      this.result = result
      this._deferredEnd && this._deferredEnd.resolve(result)
    } else {
      this.error = result
      this.isAborted = true
      this._deferredEnd && this._deferredEnd.reject(result)
    }

    this.cont(result, isErr)
    this.joiners.forEach(j => j.cb(result, isErr))
    this.joiners = null
  }

  toPromise() {
    if (this._deferredEnd) {
      return this._deferredEnd.promise
    }

    const def = deferred()
    this._deferredEnd = def

    if (!this.isRunning) {
      if (this.isAborted) {
        def.reject(this.error)
      } else {
        def.resolve(this.result)
      }
    }
    return def.promise
  }
}
