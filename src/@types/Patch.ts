import { GetOperation } from 'fast-json-patch'

// Extend fast-json-patch Operation type to include actions list
// See fast-json-patch types: https://github.com/Starcounter-Jack/JSON-Patch/blob/89a09e94e0e6500115789e33586a75c8dd1aea13/module/core.d.ts
// TODO: This should allow any Operation, not just GetOperation. But how to extend?
interface ExtendedOperation<T = any> extends GetOperation<T> {
  actions: string[]
}

type Patch = ExtendedOperation[]

export default Patch
