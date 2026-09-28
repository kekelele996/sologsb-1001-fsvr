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
  snapshots: Snapshot[]
  lastRename?: RenameRecord | null
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
  selectedCueId: string | null
  terms?: Term[]
  lastRename?: RenameRecord | null
}

export type RenameConflict = 'empty' | 'duplicate' | 'same'

export interface RenamePreview {
  term: Term
  newTarget: string
  affected: Cue[]
  locked: Cue[]
  unaffected: Cue[]
  conflict: RenameConflict | null
}

export interface RenameResult {
  changed: number
  locked: number
  skipped: number
  term: Term
  cueIds: string[]
  lockedIds: string[]
}

export interface RenameRecord extends RenameResult {
  at: number
}
