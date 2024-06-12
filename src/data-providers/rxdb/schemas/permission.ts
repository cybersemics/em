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

export type PermissionDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export type PermissionDocument = RxDocument<PermissionDocType>

export const permissionSchema: RxJsonSchema<PermissionDocType> = schemaLiteral
