export default function({
  apiUrl = process.env.AISPRESSO_API_URL,
  templatesDatabaseId = process.env.AISPRESSO_TEMPLATES_DB_ID,
  upvotesDatabaseId = process.env.AISPRESSO_UPVOTES_DB_ID,
  openAIkey = process.env.OPENAI_KEY,
  defaultParameters = {},
  usdSpent = 0
} = {}) {

  async function post(url, body) {

    const response = await fetch(apiUrl + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    if (response.ok) {
      return response.json()
    } else {
      throw new Error(response.statusText)
    }
  
  }  

  return {
    usdSpent,

    async run(slug, variables = {}, parameters = {}) {
      const data = await post('/run', {
        databaseId: templatesDatabaseId,
        slug,
        openAIkey,
        variables,
        parameters: { ...defaultParameters, ...parameters }
      })
      this.usdSpent += data.approximateCost
      return data
    },

    async generate(outputKeys, input) {
      if (!Array.isArray(outputKeys)) {
        outputKeys = [outputKeys]
      }

      const data = await post('/generate', {
        outputKeys,
        input,
        openAIkey
      })
      return data
    },

    async upvote(generationId) {
      const data = await post('/upvote', {
        databaseId: upvotesDatabaseId,
        generationId
      })
      return data
    }
  }
}