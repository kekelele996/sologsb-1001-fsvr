export type CueStatus = 'draft' | 'reviewed' | 'issue'
export type Locale = 'zh-CN' | 'en-US' | 'ja-JP'

export interface Cue {
  id: string
  start: number
  end: number
  source: string
  target: string
  actorId: string
  speed: number
  termIds: string[]
  status: CueStatus
  locked: boolean
}

export interface Actor {
  id: string
  name: string
  color: string
  localeHint: string
}

export interface Term {
  id: string
  source: string
  target: string
  note: string
}

export type TermRenameErrorCode = 'TERM_NOT_FOUND' | 'EMPTY_TARGET' | 'EMPTY_OLD_TARGET' | 'SAME_TARGET' | 'DUPLICATE_TARGET'

export interface TermRenamePlan {
  ok: boolean
  error?: TermRenameErrorCode
  termId: string
  oldTarget: string
  newTarget: string
  relatedCount: number
  replaceCueIds: string[]
  lockedCueIds: string[]
  unchangedCueIds: string[]
}

export interface TermRenameResult {
  ok: boolean
  error?: TermRenameErrorCode
  plan?: TermRenamePlan
  record?: TermRename
}

export interface TermRename {
  id: string
  termId: string
  source: string
  fromTarget: string
  toTarget: string
  replacedCueIds: string[]
  lockedCueIds: string[]
  unchangedCueIds: string[]
  createdAt: number
}

export interface Snapshot {
  id: string
  name: string
  createdAt: number
  cues: Cue[]
}

export interface EditorDocument {
  id: string
  title: string
  language: Locale
  cues: Cue[]
  actors: Actor[]
  terms: Term[]
  termRenames: TermRename[]
  snapshots: Snapshot[]
  updatedAt: number
  revision: number
  lastWriter: string
}

export interface CueConflict {
  cueId: string
  type: 'actor' | 'tone' | 'address'
  message: string
}

export interface HistoryEntry {
  label: string
  cues: Cue[]
  terms: Term[]
  termRenames: TermRename[]
  selectedCueId: string | null
}
