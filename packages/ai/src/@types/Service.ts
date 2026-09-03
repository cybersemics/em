/**
 * An AI service exposed by this server. Each service authenticates with its own OpenAI API key so that the OpenAI
 * dashboard and the Usage and Costs APIs can attribute tokens and spend to it. The value is the suffix of the service's
 * `OPENAI_API_KEY_{SERVICE}` environment variable.
 */
enum Service {
  GENERATE_EMOJI = 'GENERATE_EMOJI',
  GENERATE_THOUGHT = 'GENERATE_THOUGHT',
}

export default Service
