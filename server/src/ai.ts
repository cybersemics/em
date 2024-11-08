import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** Prompts AI for a thought. */
const ai = async (
  /** Input prompt of existing thoughts exported in plaintext that include a blank thought to be filled in. */
  input: string,
): Promise<{ content?: string | null; err?: { code?: string; status: number; message: string } }> => {
  const prompt = `Fill in the empty item. If multiple entities, just give the first.\n\n${input}`
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    })
    const choice = completion.choices[0]

    return choice?.finish_reason === 'stop'
      ? {
          content: choice.message.content,
        }
      : {
          err: {
            message: choice.finish_reason,
            status: 400,
          },
        }
  } catch (e: any) {
    return {
      err: {
        message: e.message,
        code: e.code,
        status: e.status,
      },
    }
  }
}

export default ai
