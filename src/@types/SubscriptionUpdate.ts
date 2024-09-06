interface SubscriptionUpdate<T> {
  /** Track updatedBy sepaately since value is null on deletes. */
  updatedBy?: string
  value: T | null
}

export default SubscriptionUpdate
