import { ExtractDocumentTypeFromTypedRxJsonSchema, RxDocument, RxJsonSchema, toTypedRxJsonSchema } from 'rxdb'

const schemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    archived: {
      type: 'integer',
    },
    childrenMap: {
      type: 'object',
    },
    created: {
      type: 'integer',
    },
    lastUpdated: {
      type: 'integer',
    },
    parentId: {
      type: 'string',
    },
    rank: {
      type: 'integer',
    },
    updatedBy: {
      type: 'string',
    },
    value: {
      type: 'string',
    },
    docKey: {
      type: 'string',
    },
  },
  required: ['id', 'childrenMap', 'created', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value'],
} as const

const schemaTyped = toTypedRxJsonSchema(schemaLiteral)

export type ThoughtDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export type ThoughtDocument = RxDocument<ThoughtDocType>

export const thoughtSchema: RxJsonSchema<ThoughtDocType> = schemaLiteral
