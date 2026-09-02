import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ZodType } from 'zod'
import Model from './@types/Model'
import ReasoningEffort from './@types/ReasoningEffort'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** Completes a chat and parses its structured response. */
const completeChat = async <T>({
  messages,
  model,
  reasoningEffort,
  schema,
}: {
  messages: ChatCompletionMessageParam[]
  model: Model
  schema: ZodType<T>
  reasoningEffort: ReasoningEffort
}): Promise<T> => {
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
