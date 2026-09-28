import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../src/store/editor.ts'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ---- in-memory IndexedDB shim, enough for utils/db.ts ----
const dbStore = new Map<string, any>()
const memDb: any = {
  objectStoreNames: new Set(['documents']),
  transaction() {
    const tx: any = {
      objectStore: () => ({
        get: (id: string) => {
          const req: any = { onsuccess: null, onerror: null, result: undefined }
          queueMicrotask(() => { req.result = dbStore.get(id); req.onsuccess?.() })
          return req
        },
        put: (doc: any) => {
          const req: any = { onsuccess: null, onerror: null, result: doc }
          queueMicrotask(() => { dbStore.set(doc.id, doc); req.onsuccess?.() })
          return req
        },
      }),
      oncomplete: null, onerror: null, onabort: null,
    }
    setTimeout(() => tx.oncomplete?.(), 0)
    return tx
  },
  close() {},
}
;(globalThis as any).indexedDB = {
  open: () => {
    const req: any = { onupgradeneeded: null, onsuccess: null, onerror: null, error: null, result: memDb }
    queueMicrotask(() => req.onsuccess?.())
    return req
  },
}
;(globalThis as any).BroadcastChannel = class { postMessage() {} close() {} }
;(globalThis as any).navigator = { onLine: true }
;(globalThis as any).window = globalThis

let failures = 0
const assert = (cond: boolean, msg: string) => {
  if (cond) console.log('  PASS', msg)
  else { console.error('  FAIL', msg); failures++ }
}

const run = async () => {
  setActivePinia(createPinia())
  const store = useEditorStore()
  await store.initialize()
  const findTerm = (id: string) => store.document.terms.find((t) => t.id === id)!
  const findCue = (id: string) => store.document.cues.find((c) => c.id === id)!

  console.log('\n[1] preview counts for term-01 (开源, linked by locked cue-demo-01)')
  let p = store.previewTermRename('term-01', '开放源代码')
  assert(p.conflict === null, 'no conflict')
  assert(p.affected.length === 0, `affected = ${p.affected.length} (locked cue not counted)`)
  assert(p.locked.length === 1 && p.locked[0].id === 'cue-demo-01', 'locked cue listed separately')
  assert(p.unaffected.length === 0, 'unaffected = 0')

  console.log('\n[2] duplicate target with term-04 (社区) must be blocked')
  p = store.previewTermRename('term-01', '社区')
  assert(p.conflict === 'duplicate', 'duplicate conflict flagged')
  const beforeSnapshot = JSON.stringify({ terms: store.document.terms, cues: store.document.cues, r: store.document.lastRename })
  const res = store.applyTermRename('term-01', '社区')
  assert(res === null, 'apply returns null on duplicate')
  const afterSnapshot = JSON.stringify({ terms: store.document.terms, cues: store.document.cues, r: store.document.lastRename })
  assert(beforeSnapshot === afterSnapshot, 'nothing changed on duplicate (term + all cues untouched)')

  console.log('\n[3] empty / same inputs')
  assert(store.previewTermRename('term-01', '   ').conflict === 'empty', 'empty target conflict')
  assert(store.previewTermRename('term-01', '开源').conflict === 'same', 'same target conflict')
  assert(store.applyTermRename('term-01', '   ') === null, 'empty apply rejected')

  console.log('\n[4] valid rename: term-02 维护者 used in unlocked cue-demo-02')
  p = store.previewTermRename('term-02', '核心维护者')
  assert(p.affected.length === 1 && p.affected[0].id === 'cue-demo-02', `affected cue-demo-02 (got ${p.affected.length})`)
  assert(p.locked.length === 0, 'no locked')
  const r = store.applyTermRename('term-02', '核心维护者')!
  assert(r.changed === 1 && r.locked === 0, 'result counts correct')
  assert(findTerm('term-02').target === '核心维护者', 'term target updated')
  assert(findCue('cue-demo-02').target.includes('社区核心维护者'), 'unlocked cue replaced: ' + findCue('cue-demo-02').target)

  console.log('\n[5] rename term-01: locked cue keeps old text, term still updates')
  const r2 = store.applyTermRename('term-01', '开放源代码')!
  assert(findTerm('term-01').target === '开放源代码', 'term target updated even when only locked cues')
  assert(findCue('cue-demo-01').target.includes('开源并不是'), 'locked cue unchanged: ' + findCue('cue-demo-01').target)
  assert(!findCue('cue-demo-01').target.includes('开放源代码'), 'locked cue does not contain new term')
  assert(r2.changed === 0 && r2.locked === 1, 'record: changed 0 / locked 1')
  assert(store.document.lastRename?.lockedIds[0] === 'cue-demo-01', 'lastRename persists locked id')

  console.log('\n[6] unaffected linked cue (no old text) is not replaced, counted skipped')
  findCue('cue-demo-03').termIds = ['term-04'] // add link; cue-demo-03 target has no 社区
  const p3 = store.previewTermRename('term-04', '开发者社区')
  assert(p3.unaffected.length === 1 && p3.unaffected[0].id === 'cue-demo-03', 'unaffected counted: cue-demo-03')
  assert(p3.affected.length === 1 && p3.affected[0].id === 'cue-demo-02', 'affected still includes cue-demo-02 (contains 社区)')

  console.log('\n[7] undo restores both term target and cue text')
  store.undo() // undo term-01 rename
  assert(findTerm('term-01').target === '开源', 'undo restores term target')
  assert(findCue('cue-demo-01').target.includes('开源并不是'), 'undo locked cue still intact')
  store.undo() // undo term-02 rename
  assert(findTerm('term-02').target === '维护者', 'undo restores term-02 target')
  assert(findCue('cue-demo-02').target.includes('社区维护者'), 'undo restores cue text')
  store.redo()
  assert(findTerm('term-02').target === '核心维护者', 'redo re-applies term')
  assert(findCue('cue-demo-02').target.includes('社区核心维护者'), 'redo re-applies cue')

  console.log('\n[8] lastRename restored by redo')
  assert(store.document.lastRename?.term.target === '核心维护者', 'redo restores lastRename record')

  console.log('\n[9] persistence: reopen store from the same IndexedDB shim')
  await sleep(900) // let 500ms autosave debounce flush
  setActivePinia(createPinia())
  const store2 = useEditorStore()
  await store2.initialize()
  assert(store2.document.terms.find((t) => t.id === 'term-02')?.target === '核心维护者', 'term change persisted')
  assert(!!store2.document.lastRename && store2.document.lastRename.term.target === '核心维护者', 'lastRename batch result persisted across reopen')
  assert(store2.document.cues.find((c) => c.id === 'cue-demo-02')?.target.includes('社区核心维护者'), 'cue change persisted')
  assert(store2.document.cues.find((c) => c.id === 'cue-demo-01')?.target.includes('开源并不是'), 'locked cue preserved across reopen')

  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED'}`)
  process.exitCode = failures === 0 ? 0 : 1
}

run().catch((error) => { console.error('FATAL', error); process.exitCode = 1 })
