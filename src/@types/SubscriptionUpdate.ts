interface SubscriptionUpdate<T> {
  // track updatedBy sepaately since value is null on deletes
  updatedBy?: string
  value: T | null
}

export default SubscriptionUpdate
