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
    contexts: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 100,
      },
    },
    created: {
      type: 'integer',
    },
    lastUpdated: {
      type: 'integer',
    },
    updatedBy: {
      type: 'string',
    },
  },
  required: ['id', 'contexts', 'created', 'lastUpdated', 'updatedBy'],
} as const

const schemaTyped = toTypedRxJsonSchema(schemaLiteral)

export type LexemeDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>

export type LexemeDocument = RxDocument<LexemeDocType>

export const lexemeSchema: RxJsonSchema<LexemeDocType> = schemaLiteral
