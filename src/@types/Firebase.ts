import { Index } from './IndexType'

export interface Firebase {
  auth: (() => {
    currentUser: User
    onAuthStateChanged: (f: (user: User) => void) => void
    signInWithRedirect: (provider: any) => void
    createUserWithEmailAndPassword: (email: string, password: string) => Promise<{ user: User }>
    signInWithEmailAndPassword: (email: string, password: string) => Promise<{ user: User }>
    sendPasswordResetEmail: (email: string, passwordResetOptions: { url: string }) => Promise<void>
    signOut: () => void
  }) & { GoogleAuthProvider: any }
  database: () => {
    ref: (s: string) => Ref<any>
  }
  initializeApp: (config: Index<string>) => void
}

export interface User {
  uid: string
  displayName: string
  email: string
  invites: Record<string, boolean>
  // see Firebase user for more properties
}

export interface Ref<T> {
  child: <R>(name: string) => Ref<R>
  once: (eventName: string, callback?: (snapshot: Snapshot<T>) => void) => Promise<Snapshot<T>>
  on: (eventName: string, callback: (snapshot: Snapshot<T>) => any) => void
  limitToFirst: (n: number) => Ref<T>
  limitToLast: (n: number) => Ref<T>
  orderByChild: (fieldName: string) => Ref<T>
  startAt: (value: any) => Ref<T>
  set: (value: any, onComplete?: (a: Error | null) => any) => Promise<any>
  update: (updates: Index, callback?: (err: Error | null, ...args: any[]) => void) => Promise<any>
}

export interface Snapshot<T = any> {
  // same as object id
  key: string
  val: () => T
}
