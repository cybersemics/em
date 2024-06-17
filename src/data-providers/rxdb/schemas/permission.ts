import { ExtractDocumentTypeFromTypedRxJsonSchema, RxDocument, RxJsonSchema, toTypedRxJsonSchema } from 'rxdb'

const schemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 22,
    },
    created: {
      type: 'integer',
    },
    role: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    accessed: {
      type: 'integer',
    },
  },
  required: ['id', 'created', 'role'],
} as const

const schemaTyped = toTypedRxJsonSchema(schemaLiteral)

export type RxPermission = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export type RxPermissionDocument = RxDocument<RxPermission>

export const permissionSchema: RxJsonSchema<RxPermission> = schemaLiteral
