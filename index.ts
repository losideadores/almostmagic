export default function({
  apiUrl = process.env.LAMP_API_URL || 'https://ideality.app/api/lamp',
  templatesDatabaseId = process.env.LAMP_TEMPLATES_DB_ID,
  upvotesDatabaseId = process.env.LAMP_UPVOTES_DB_ID,
  openAIkey = process.env.OPENAI_KEY,
  defaultParameters = {},
  usdSpent = 0
}: {
  apiUrl?: string;
  templatesDatabaseId?: string;
  upvotesDatabaseId?: string;
  openAIkey?: string;
  defaultParameters?: object;
  usdSpent?: number;
} = {}): {
  usdSpent: number;
  run: (slug: string, variables?: object, parameters?: object) => Promise<object>;
  generate: (outputKeys: string | string[], input: object) => Promise<object>;
  upvote: (generationId: string) => Promise<object>;
} {

  async function post(url: string, body: object) {

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

    async run(slug: string, variables: object = {}, parameters: object = {}) {
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

    async generate(outputKeys: string | string[], input: object) {
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

    async upvote(generationId: string) {
      const data = await post('/upvote', {
        databaseId: upvotesDatabaseId,
        generationId
      })
      return data
    }
  }
}