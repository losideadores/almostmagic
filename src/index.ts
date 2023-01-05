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

export interface MagicCostContainer {
  usdSpent: number
}

export interface MagicConfig extends MagicCostContainer {
  apiUrl?: string
  templatesDatabaseId?: string
  upvotesDatabaseId?: string
  openaiKey?: string
  parameters?: object
  externalCostContainer?: MagicCostContainer
  outputKeys?: object
  specs?: MagicSpecs
  examples?: object[]
  retries?: number
  alwaysReturnObject?: boolean
}

export default class Magic {

  config: MagicConfig
  lastMeta: object | null = null
  
  // getter/setter for usdSpent (so it's easier to access for the user)
  get usdSpent() { return ( this.config.externalCostContainer || this.config ).usdSpent }
  set usdSpent(value) { if ( this.config.externalCostContainer ) this.config.externalCostContainer.usdSpent = value; else this.config.usdSpent = value }

  constructor(config: MagicConfig = { usdSpent: 0 }) {

    this.config = {
      parameters: {},
      ...config
    }

  }

  async run(slug: string, variables: object = {}, parameters: object = {}, config?: MagicConfig) {

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
  async generate(outputKeys_or_input?: string | string[] | object | null, input_or_config: object | MagicConfig | null = null, config_or_nothing?: MagicConfig) {

    const outputKeysPassed = typeof outputKeys_or_input === 'string' || Array.isArray(outputKeys_or_input)

    const [ outputKeys, input, config ] = outputKeysPassed ? [ outputKeys_or_input, input_or_config, config_or_nothing ] : [ '', outputKeys_or_input, input_or_config ]

    const c = Object.assign({}, this.config, config)

    const { specs, examples, parameters, retries } = c

    if ( !outputKeysPassed && !specs?.outputKeys ) 
      throw new Error('You must either pass in an outputKeys parameter, or instantiate Magic with { specs: { outputKeys: [...] } }')

    let data = await post(c.apiUrl, '/generate', {
      outputKeys,
      input,
      openAIkey: c.openaiKey,
      specs,
      examples,
      parameters,
      retries
    })

    const { approximateCost, tokenCount } = data._meta || data
    this.usdSpent += approximateCost
    this.lastMeta = { approximateCost, tokenCount }

    data = data._meta ? data : data.choices
    
    // If there was just one output key, return the value instead of the object (or array of values instead of array of objects, if there are multiple choices)
    if ( outputKeysPassed && typeof outputKeys === 'string' && !c.alwaysReturnObject ) {
      // We can't just use outputKeys as a key because the server camelCases it, so we have to just take the only key from the object
      const onlyValue = (object: object) => (object as { [key: string]: any })[Object.keys(object)[0]]
      data = Array.isArray(data) ? data.map(d => onlyValue(d)) : onlyValue(data)
    }

    return data
  }

  async upvote(generationId: string, config?: MagicConfig) {

    const c = Object.assign({}, this.config, config)

    const data = await post(c.apiUrl, '/upvote', {
      databaseId: c.upvotesDatabaseId,
      generationId
    })

    return data
  }

  static create(config?: MagicConfig) {
    return new Magic(config)
  }

  static generate(outputKeys: string | string[], input: object, config?: MagicConfig) {
    // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
    // We still need the "config" parameter because they will need to pass in their openaiKey.
    return new Magic(config).generate(outputKeys, input)
  }

}