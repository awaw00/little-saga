import { io, is, noop } from '../../src'
import EventEmitter from 'events'

const run = fn =>
  new Env(noop)
    .use(commonEffects)
    .use(channelEffects)
    .def('echo', ([effect, arg], ctx, cb) => cb(arg))
    .run(fn)

test('saga iteration', async done => {
  let actual = []

  const task = run(function*() {
    const { echo } = io
    actual.push(yield echo(1))
    actual.push(yield echo(2))
    return 3
  })

  expect(is.promise(task.toPromise())).toBe(true)
  expect(actual).toEqual([1, 2])
  expect(await task.toPromise()).toBe(3)
  expect(task.isRunning).toBe(false)

  done()
})

test('saga error handling', done => {
  function fnThrow() {
    throw new Error('error')
  }
  const task1 = run(function*() {
    fnThrow()
  })

  task1.toPromise().catch(err => {
    // saga must return a rejected promise if generator throws an uncaught error
    expect(err.message).toBe('error')
    done()
  })

  /* try + catch + finally */
  let actual = []
  function* genFinally() {
    try {
      fnThrow()
      actual.push('unerachable')
    } catch (error) {
      actual.push('caught-' + error.message)
    } finally {
      actual.push('finally')
    }
  }

  run(genFinally)
    .toPromise()
    .then(() => {
      // saga must route to catch/finally blocks in the generator
      expect(actual).toEqual(['caught-error', 'finally'])
    })
})

test('saga output handling', async () => {
  let actual = []
  const emitter = new EventEmitter()
  const env = new Env(noop)
    .use(commonEffects)
    .use(channelEffects)
    .use(connectToEmitter(emitter))
  emitter.addListener('action', action => actual.push(action.type))

  function* genFn(arg) {
    yield io.put({ type: arg })
    yield io.put({ type: 2 })
  }

  await env.run(genFn, 'arg').toPromise()
  const expected = ['arg', 2]
  expect(actual).toEqual(expected)
})

test('saga yielded falsy values', async () => {
  let actual = []

  await run(function*() {
    const { echo } = io
    actual.push(yield echo(false))
    actual.push(yield echo(undefined))
    actual.push(yield echo(null))
    actual.push(yield echo(''))
    actual.push(yield echo(0))
    actual.push(yield echo(NaN))
  }).toPromise()

  const expected = [false, undefined, null, '', 0, NaN]
  expect(actual).toEqual(expected)
})
