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
    ref: (s: string) => Ref
  }
  initializeApp: (config: Index<string>) => void
}

export interface User {
  uid: string
  displayName: string
  email: string
  invites: Record<string, never>
  // see Firebase user for more properties
}

export interface Ref {
  child: (name: string) => Ref
  once: (eventName: string, callback?: (snapshot: Snapshot) => void) => Promise<Snapshot>
  on: (eventName: string, callback: (snapshot: Snapshot) => any) => void
  set: (value: any, onComplete?: (a: Error | null) => any) => Promise<any>
  update: (updates: Index, callback?: (err: Error | null, ...args: any[]) => void) => Promise<any>
}

export interface Snapshot<T = any> {
  val: () => T
}
