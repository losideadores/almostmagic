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
  outputKeys?: object
  specs?: MagicSpecs
  examples?: object[]
}

export default class Magic {

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

  async run(slug: string, variables: object = {}, parameters: object = {}, config: MagicConfig = {}) {

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

  async generate(outputKeys: string | string[], input?: object | null, config?: MagicConfig ): Promise<any>
  async generate(input?: object | null, config?: MagicConfig ): Promise<any>
  async generate(outputKeys_or_input?: string | string[] | object | null, input_or_config: object | null | MagicConfig = null, config_or_nothing: MagicConfig = {}) {

    const outputKeysPassed = typeof outputKeys_or_input === 'string' || Array.isArray(outputKeys_or_input)

    const [ outputKeys, input, config ] = outputKeysPassed ? [ outputKeys_or_input, input_or_config, config_or_nothing ] : [ '', outputKeys_or_input, input_or_config ]

    const c = Object.assign({}, this.config, config)

    const { specs, examples, parameters } = c

    if ( !outputKeysPassed && !specs?.outputKeys ) 
      throw new Error('You must either pass in an outputKeys parameter, or instantiate Magic with { specs: { outputKeys: [...] } }')

    const data = await post(c.apiUrl, '/generate', {
      outputKeys,
      input,
      openAIkey: c.openaiKey,
      specs,
      examples,
      parameters,
    })

    const { approximateCost, tokenCount } = data._meta || data
    this.usdSpent += approximateCost
    this.lastMeta = { approximateCost, tokenCount }

    return data._meta ? data : data.choices
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