// region basics
export interface Callback<T = any> {
  (result?: T | Error, isErr?: boolean): void
  cancel?(): void
}

declare global {
  interface Promise<T> {
    [CANCEL]?: () => void
  }
}

type Func<ARGS extends any[], Ret = any> = (...args: ARGS) => Ret

export interface Task {
  isRunning: boolean
  isCancelled: boolean
  isAborted: boolean
  result: any
  error: any
  cancel: () => void
  toPromise(): Promise<any>
}
// endregion

// region symbols
export const TASK_CANCEL: unique symbol
export const CANCEL: unique symbol
export const IO: unique symbol
export const SELF_CANCELLATION: unique symbol
// endregion

// region utils
export function identity<T>(arg: T): T
export type DeferredEnd<T, P> = {
  promise?: Promise<T>
  resolve?(result: T): void
  reject?(error: any): void
} & P
export function deferred<T = any, P = {}>(props?: P): DeferredEnd<T, P>
export function delay<T = true>(ms: number, val?: T): Promise<T>
export const noop: () => void
export const always: <T>(v: T) => () => T
export function once<F extends Function>(fn: F): F
export const is: {
  func: (f: any) => f is Function
  number: (n: any) => n is number
  string: (s: any) => s is string
  symbol: (s: any) => s is symbol
  array: (arg: any) => arg is any[]
  object: (obj: any) => boolean
  promise: (p: any) => p is Promise<any>
  iterator: (it: any) => it is Iterator<any>
  channel: (ch: any) => boolean
  effect: (eff: any) => eff is Effect
}
export function remove<T>(array: T[], item: T): void
export function makeMatcher<T>(pattern?: TakePattern<T>): (message: T) => boolean
// endregion

// region sagaHelpers
export function takeEvery(patternOrChannel: any, worker: any, ...args: any[]): any
export function takeLeading(patternOrChannel: any, worker: any, ...args: any[]): any
export function takeLatest(patternOrChannel: any, worker: any, ...args: any[]): any
export function throttle(ms: number, pattern: any, worker: any, ...args: any[]): any
export function debounce(ms: number, channelOrPattern: any, worker: any, ...args: any[]): any
// endregion

// region io
export type Effect =
  | ForkEffect
  | JoinEffect
  | CancelEffect
  | CancelledEffect
  | AllEffect
  | RaceEffect
  | CPSEffect
  | CallEffect
  | SetContextEffect
  | GetContextEffect
  | SelectEffect
  | TakeEffect
  | PutEffect
  | FlushEffect
  | ActionChannelEffect
  | CustomEffect

export interface ForkEffect {
  type: 'FORK'
  payload: { fn: any; args: any[]; detached: boolean }
}

export interface JoinEffect {
  type: 'JOIN'
  payload: Task | Task[]
}

export interface CancelEffect {
  type: 'CANCEL'
  payload: typeof SELF_CANCELLATION | Task | Task[]
}

export interface CancelledEffect {
  type: 'CANCELLED'
  payload: undefined
}

export interface AllEffect {
  type: 'ALL'
  payload: Effect[] | { [key: string]: Effect }
}

export interface RaceEffect {
  type: 'RACE'
  payload: Effect[] | { [key: string]: Effect }
}

export interface CPSEffect {
  type: 'CPS'
  payload: { context: any; fn: any; args: any[] }
}

export interface CallEffect {
  type: 'CALL'
  payload: { context: any; fn: any; args: any[] }
}

export interface SetContextEffect {
  type: 'SET_CONTEXT'
  payload: { prop: string; value: any }
}

export interface GetContextEffect {
  type: 'GET_CONTEXT'
  prop: string
}

export interface SelectEffect {
  type: 'SELECT'
  payload: { selector: (state: any) => any; args: any[] }
}

export interface TakeEffect {
  type: 'TAKE'
  payload: {
    channel: Channel | MulticastChannel | EventChannel
    pattern: any
    maybe: boolean
  }
}

export interface PutEffect {
  type: 'PUT'
  payload: {
    channel: Channel | MulticastChannel
    action: any
    resolve: boolean
  }
}

export interface FlushEffect {
  type: 'FLUSH'
  payload: Channel
}

export interface ActionChannelEffect {
  type: 'ACTION_CHANNEL'
  payload: {
    pattern: any
    buffer: Buffer<any>
  }
}

type TakePattern<T> = '*' | string | ((message: T) => boolean) | any[]

export const io: {
  fork<ARGS extends any[]>(fn: Func<ARGS>, ...args: ARGS): ForkEffect
  spawn<ARGS extends any[]>(fn: Func<ARGS>, ...args: ARGS): ForkEffect
  join(t: Task | Task[]): JoinEffect
  cancel(t?: Task | Task[]): CancelEffect
  cancelled(): CancelledEffect
  all(effects: any[] | { [key: string]: any }): AllEffect
  race(effects: any[] | { [key: string]: any }): RaceEffect
  cps<T, ARGS extends any[]>(
    fn: (cb: (err: any, result: T) => any, ...args: ARGS) => any,
    ...args: ARGS
  ): CPSEffect
  call<ARGS extends any[]>(fn: Func<ARGS>, ...args: ARGS): CallEffect
  apply<ARGS extends any[]>(context: any, fn: Func<ARGS>, ...args: ARGS): CallEffect
  setContext(prop: string, value: any): SetContextEffect
  getContext(prop: string | symbol): GetContextEffect
  select<S, ARGS extends any[]>(
    selector?: (state: S, ...args: ARGS) => any,
    ...args: ARGS
  ): SelectEffect
  take(pattern?: TakePattern<any>): TakeEffect
  take<T>(
    channel: Channel<T> | MulticastChannel<T> | EventChannel<T>,
    pattern?: TakePattern<T>,
  ): TakeEffect
  put<T>(message: T): PutEffect
  put<T>(ch: Channel<T> | MulticastChannel<T>, message: T | typeof END): PutEffect
  flush<T>(chan: Channel<T>): FlushEffect
  actionChannel(pattern: TakePattern<any>, buffer?: Buffer<any>): ActionChannelEffect
}

export function detach(effect: ForkEffect): ForkEffect

type CustomEffect = { type: string; payload: any }
export function makeEffect(type: string, payload: any): CustomEffect
// endregion

// region runSaga and middleware
interface RunSagaOptions {
  taskContext: any
  cont: Callback
  channel: MulticastChannel
  customEffectRunnerMap: { [key: string]: any }
  customEnv: any
  dispatch(action: any): void
  getState(): any
}

export function runSaga(options: Partial<RunSagaOptions>, fn: any, ...args: any[]): Task

export function createSagaMiddleware(
  options?: Partial<RunSagaOptions>,
): {
  (middlewareAPI: any): (next: any) => (action: any) => any
  run?(fn: Function, ...args: any[]): Task
}
// endregion

// region channels and buffers
export const END: unique symbol
export const MATCH: unique symbol
export const SAGA_ACTION: unique symbol

export const buffers: {
  none<T>(): Buffer<T>
  fixed<T>(limit?: number): Buffer<T>
  dropping<T>(limit?: number): Buffer<T>
  sliding<T>(limit?: number): Buffer<T>
  expanding<T>(limit?: number): Buffer<T>
}

export interface Buffer<T> {
  isEmpty(): boolean
  put(message: T): void
  take(): T | undefined
  flush(): T[]
}

export interface Channel<T = any> {
  take(cb: (message: T | typeof END) => void): void
  put(message: T | typeof END): void
  flush(cb: (items: T[] | typeof END) => void): void
  close(): void
}
export function channel<T>(buffer?: Buffer<T>): Channel<T>

export interface EventChannel<T = any> {
  take(cb: (message: T | typeof END) => void): void
  flush(cb: (items: T[] | typeof END) => void): void
  close(): void
}
export type Subscribe<T> = (cb: (input: T | typeof END) => void) => () => void
export function eventChannel<T>(subscribe: Subscribe<T>, buffer?: Buffer<T>): EventChannel<T>

export type Predicate<T> = (arg: T) => boolean
export interface MulticastChannel<T = any> {
  take(cb: (message: T | typeof END) => void, matcher?: Predicate<T>): void
  put(message: T | typeof END): void
  close(): void
  connect(dispatch: (action: T | typeof END) => void): this
}
export function multicastChannel<T>(): MulticastChannel<T>

type PutFn = (message: any) => void
interface Ehanceable {
  enhancePut(enhancer: (oldPut: PutFn) => PutFn): this
}
export function stdChannel(): MulticastChannel & Ehanceable
// endregion
