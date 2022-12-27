const DEFAULT_URL = 'https://ideality.app/api/polygon'

async function post(baseUrl: string = DEFAULT_URL, url: string, body: object) {

  const response = await fetch(baseUrl + url, {
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

export interface MagicConfig {
  apiUrl?: string
  templatesDatabaseId?: string
  upvotesDatabaseId?: string
  openaiKey?: string
  defaultParameters?: object
  usdSpent?: number
}

export default class Magic {

  config: MagicConfig
  
  // getter/setter for usdSpent (so it's easier to access for the user)
  get usdSpent() { return this.config.usdSpent }
  set usdSpent(value) { this.config.usdSpent = value }

  constructor(config: MagicConfig = {}) {

    this.config = {
      usdSpent: 0,
      defaultParameters: {},
      ...config
    }

  }

  async run(slug: string, variables: object = {}, parameters: object = {}, config: MagicConfig = {}) {

    const c = Object.assign({}, this, config)
    
    const data = await post(c.apiUrl, '/run', {
      databaseId: c.templatesDatabaseId,
      slug,
      openAIkey: c.openaiKey,
      // TODO: change the way `openAIkey` is spelled on the server
      variables,
      parameters: { ...c.defaultParameters, ...parameters }
    })

    this.usdSpent += data.approximateCost

    return data
  }

  async generate(outputKeys: string | string[], input: object, config: MagicConfig = {}) {

    const c = Object.assign({}, this, config)

    if (!Array.isArray(outputKeys)) {
      outputKeys = [outputKeys]
    }

    const data = await post(c.apiUrl, '/generate', {
      outputKeys,
      input,
      openAIkey: c.openaiKey,
    })

    this.usdSpent += data._meta.approximateCost

    return data
  }

  async upvote(generationId: string, config: MagicConfig = {}) {

    const c = Object.assign({}, this, config)

    const data = await post(c.apiUrl, '/upvote', {
      databaseId: c.upvotesDatabaseId,
      generationId
    })

    return data
  }

  static create(config: MagicConfig = {}) {
    return new Magic(config)
  }

  static generate(outputKeys: string | string[], input: object, config: MagicConfig = {}) {
    // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
    // We still need the "config" parameter because they will need to pass in their openaiKey.
    return new Magic(config).generate(outputKeys, input)
  }

}