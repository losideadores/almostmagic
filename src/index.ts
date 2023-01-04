const DEFAULT_URL = 'https://ideality.app/api/polygon'

async function post(baseUrl: string = DEFAULT_URL, url: string, body: object) {

  // console.log('POST', baseUrl + url, body)

  const response = await fetch(baseUrl + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  // console.log('response', response)

  if (response.ok) {
    return response.json()
  } else {
    throw new Error(response.statusText) 
  }

}

export interface MagicSpecs {
  // output keys (optional)
  outputKeys?: object | string[] | string
  // And anything else
  [key: string]: any
}

export interface MagicConfig {
  apiUrl?: string
  templatesDatabaseId?: string
  upvotesDatabaseId?: string
  openaiKey?: string
  parameters?: object
  usdSpent?: number
  keyForGuidelines?: string
  outputKeys?: object
  specs?: MagicSpecs
  examples?: object[]
}

export class Magic {

  config: MagicConfig
  lastMeta: object | null = null
  
  // getter/setter for usdSpent (so it's easier to access for the user)
  get usdSpent() { return this.config.usdSpent }
  set usdSpent(value) { this.config.usdSpent = value }

  constructor(config: MagicConfig = {}) {

    this.config = {
      usdSpent: 0,
      parameters: {},
      ...config
    }

  }

  async runCustom(slug: string, variables: object = {}, parameters: object = {}, config: MagicConfig = {}) {

    const c = Object.assign({}, this.config, config)
    
    const data = await post(c.apiUrl, '/run', {
      databaseId: c.templatesDatabaseId,
      slug,
      openAIkey: c.openaiKey,
      // TODO: change the way `openAIkey` is spelled on the server
      variables,
      parameters: { ...c.parameters, ...parameters }
    })
    
    const { approximateCost, tokenCount } = data
    this.usdSpent += approximateCost
    this.lastMeta = { approximateCost, tokenCount }

    return data
  }

  async generate(outputKeys: string | string[] | object, input?: any, config: MagicConfig = {}) {

    const c = Object.assign({}, this.config, config)

    const { keyForGuidelines, specs, examples, parameters } = c

    const data = await post(c.apiUrl, '/generate', {
      outputKeys,
      input,
      openAIkey: c.openaiKey,
      specs,
      examples,
      parameters,
      ...keyForGuidelines ? { keyForGuidelines } : {}
    })
    
    const { approximateCost, tokenCount } = data._meta || data
    this.usdSpent += approximateCost
    this.lastMeta = { approximateCost, tokenCount }

    return data._meta ? data : data.choices
  }

  async run(input?: any) {
    // Runs generate with the config's specs' outputKeys, if any.
    const { outputKeys } = this.config.specs || {}
    if (!outputKeys) throw new Error('No outputKeys in specs. Instantiate Magic with { specs: { outputKeys: ... } } if you want to use run().')
    const keys =
      // Must be an array, so if it's a string, make it an array, and if it's an object, get the keys.
      typeof outputKeys === 'string' ? [outputKeys] : Array.isArray(outputKeys) ? outputKeys : Object.keys(outputKeys)
    return this.generate(keys, input)
  }

  async upvote(generationId: string, config: MagicConfig = {}) {

    const c = Object.assign({}, this.config, config)

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

export default Magic