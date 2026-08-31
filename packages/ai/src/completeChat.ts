import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ZodType } from 'zod'
import Model from './@types/Model'
import ReasoningEffort from './@types/ReasoningEffort'
import Service from './@types/Service'

/** Completes a chat and parses its structured response. */
const completeChat = async <T>({
  messages,
  model,
  reasoningEffort,
  schema,
  service,
}: {
  messages: ChatCompletionMessageParam[]
  model: Model
  schema: ZodType<T>
  reasoningEffort: ReasoningEffort
  /** The service the request is made on behalf of, which selects the API key it is billed to. */
  service: Service
}): Promise<T> => {
  // Authenticate as the service so that the OpenAI dashboard and the Usage and Costs APIs can group tokens and spend by
  // API key. Fall back to the shared key, which is all that local development and a single-key deployment need.
  const apiKey = process.env[`OPENAI_API_KEY_${service}`] || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(`Missing OPENAI_API_KEY_${service} and OPENAI_API_KEY`)
  }
  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.parse({
    messages,
    model,
    response_format: zodResponseFormat(schema, 'json_object'),
    reasoning_effort: reasoningEffort,
  })
  const completion = response.choices[0].message.parsed
  if (completion === null) {
    throw new Error('A completion was not returned by the LLM')
  }
  return completion
}

export default completeChat
