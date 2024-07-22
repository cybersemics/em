import { ExtractDocumentTypeFromTypedRxJsonSchema, RxDocument, RxJsonSchema, toTypedRxJsonSchema } from 'rxdb'

const schemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 13,
    },
    archived: {
      type: 'integer',
    },
    childrenMap: {
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
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
  },
  required: ['id', 'childrenMap', 'created', 'lastUpdated', 'rank', 'updatedBy', 'value'],
} as const

const schemaTyped = toTypedRxJsonSchema(schemaLiteral)

export type RxThought = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export type RxThoughtDocument = RxDocument<RxThought>

export const thoughtSchema: RxJsonSchema<RxThought> = schemaLiteral
