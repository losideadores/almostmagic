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

export interface MagicReturnValueObject {
  description: string
  optional: boolean 
}

export interface MagicReturnObject {
  [key: string]: string | MagicReturnValueObject
}

export type MagicReturns = MagicReturnObject | string[] | string

export interface MagicSpecs {
  // returns (optional)
  // returns?: MagicReturnObject | string[] | string
  returns?: MagicReturns
  // And anything else
  [key: string]: any
}

export interface MagicCostContainer {
  usdSpent?: number
}

export interface MagicConfig extends MagicCostContainer {
  alwaysReturnObject?: boolean
  apiUrl?: string
  descriptor?: string
  examples?: object[]
  externalCostContainer?: MagicCostContainer
  ignoreAmbiguityWarnings?: boolean
  openaiKey?: string
  optionalReturns?: string[] | true
  outputKeys?: object // For backwards compatibility
  parameters?: object
  postprocess?: (data: any) => any
  retries?: number
  specs?: MagicSpecs
  templatesDatabaseId?: string
  upvotesDatabaseId?: string
}

const defaultConfig: MagicConfig = {
  usdSpent: 0,
  retries: 2
}

export interface ForkOptions {
  mergeSpecs?: boolean
}

export default class Magic {

  config: MagicConfig
  lastMeta: object | null = null
  
  // getter/setter for usdSpent (so it's easier to access for the user)
  get usdSpent() { return ( this.config.externalCostContainer || this.config ).usdSpent }
  set usdSpent(value) { if ( this.config.externalCostContainer ) this.config.externalCostContainer.usdSpent = value; else this.config.usdSpent = value }

  constructor(config: MagicConfig = defaultConfig) {

    config = { ...defaultConfig, ...config }

    // Rename outputKeys to returns and show a deprecation warning
    if ( config.outputKeys ) {
      console.warn('Magic: `outputKeys` is deprecated and will be removed in a future version. Please use `returns` instead.')
    }

    this.config = {
      parameters: {},
      ...config,
    }

  }

  async run(slug: string, variables: object = {}, parameters: object = {}, config?: MagicConfig): Promise<any> {

    const c = Object.assign({}, this.config, config)
    
    const data = await post(c.apiUrl, '/run', {
      databaseId: c.templatesDatabaseId,
      slug,
      openaiKey: c.openaiKey,
      variables,
      parameters: { ...c.parameters, ...parameters }
    })
    
    const { approximateCost, tokenCount } = data
    this.usdSpent += approximateCost
    this.lastMeta = { approximateCost, tokenCount }

    // TODO: add validate for run() as well

    return data
  }

  generateFor(input: object, config?: MagicConfig): Promise<any> {
    if ( !this.config.specs?.returns ) {
      throw new Error('Magic: `magic.for(...)` can only be used if `magic.config.specs.returns` is set (either during instantiation or later with `magic.config.specs = { returns: ... }`')
    }
    return this.generate(input, { ...(config || {}), ignoreAmbiguityWarnings: true })
  }

  // We can run generate in three ways:
  // 1. ( inputs?, config? ), if specs.returns is set
  // 2. ( returns, inputs?, config? ), if specs.returns is not set
  // So we can have 0, 1, 2 or 3 parameters:
  // 0: inputs are {} and config is taken from the instance
  // - if specs.returns is not set, throw an error saying that you must pass in returns either as the first parameter or in the config.specs.returns
  // 1:
  // - ( inputs ) if specs.returns is set
  // - ( returns ) otherwise
  // - { config } = this
  // 2:
  // - ( inputs, config ) if specs.returns is set
  // - ( returns, inputs ) otherwise; { config } = this
  // 3:
  // - ( returns, inputs, config )
  // - Throw an error if specs.returns is set, saying that you can't pass in returns twice
  async generate(input?: object | null, config?: MagicConfig): Promise<any>
  async generate(returns: MagicReturns, input?: object | null, config?: MagicConfig ): Promise<any>
  async generate(returns_or_input?: MagicReturns | object | null, input_or_config: object | MagicConfig | null = null, config_or_nothing?: MagicConfig) {

    let input: object = {}
    let { config } = this
    let { returns } = this.config?.specs || {}

    switch ( arguments.length ) {
      case 0:
        if ( returns ) {
          // Keeping for easier comparing to other cases 
        } else {
          throw new Error('You must either pass in an returns parameter, or instantiate Magic with { specs: { returns: ... } }')
        }
        break
      case 1:
        if ( returns ) {
          input = returns_or_input as object
          if (!config.ignoreAmbiguityWarnings)
            console.warn('Magic: Treating the parameter as `input`. To avoid misinterpreting it as `returns`, consider using `magic.generateFor(input)` instead.')
        } else {
          returns = returns_or_input as MagicReturns
        }
        break
      case 2:
        if ( returns ) {
          input = returns_or_input as object
          config = input_or_config as MagicConfig
          if (!config.ignoreAmbiguityWarnings)
            console.warn('Magic: Treating first parameter as `input`, and second parameter as `config`, taking `returns` from `config.specs`. To avoid misinterpreting this call as having `returns` for the first parameter, consider using `magic.generateFor(input, config)` instead.')
        } else {
          returns = returns_or_input as MagicReturns
          input = input_or_config as object
        }
        break
      case 3:
        if ( returns ) {
          throw new Error('You can\'t pass in returns twice (both as the first parameter and in the config.specs.returns)')
        } else {
          returns = returns_or_input as MagicReturns
          input = input_or_config as object
          config = config_or_nothing as MagicConfig
        }
        break
    }

    const c = Object.assign({}, this.config, config)

    const { openaiKey, apiUrl, descriptor, specs, examples, parameters, retries, optionalReturns } = c

    // const go = async (retriesLeft: number = retries || 2 ) => {
    const go: ( lastArray?: any[], retriesLeft?: number ) => Promise<any> = async ( lastArray = [], retriesLeft = retries || 2 ) => {

      let data = await post(apiUrl, '/generate' + ( descriptor ? `/${descriptor}` : '' ), {
        returns,
        input,
        openaiKey,
        specs,
        examples,
        parameters,
        optionalReturns,
        retries
      })

      const { approximateCost, tokenCount } = data._meta || data
      this.usdSpent += approximateCost
      this.lastMeta = { approximateCost, tokenCount }

      data = data._meta ? data : data.choices
      
      // If there was just one return, return the value instead of the object (or array of values instead of array of objects, if there are multiple choices)
      if ( typeof returns === 'string' && !c.alwaysReturnObject ) {
        // We can't just use returns as a key because the server camelCases it, so we have to just take the only key from the object
        const onlyValue = (object: object) => (object as { [key: string]: any })[Object.keys(object)[0]]
        data = Array.isArray(data) ? data.map(d => onlyValue(d)) : onlyValue(data)
      }

      // console.debug('Data:', data)

      if ( c.postprocess ) {

        const { postprocess } = c
        
        const processed: (data: any) => any = (data) => {
          try {
            // Create a dataWithoutMeta object that doesn't have the _meta property
            const { _meta, ...dataWithoutMeta } = data
            // Postprocess the data, and then add the _meta property back
            return { ...postprocess(dataWithoutMeta), _meta }
          } catch (e: any) {
            if ( retriesLeft > 0 )
              console.warn(e)
          }
        }

        if ( Array.isArray(data) ) {
          data = [...lastArray, ...data.map(processed).filter(d => d !== undefined)]
        } else {
          data = processed(data)
        }

        if ( data === undefined || Array.isArray(data) && data.length === 0 ) {
          if ( retriesLeft > 0 ) {
            console.warn('Retrying...')
            return go(data, retriesLeft - 1)
          } else {
            throw new Error('Postprocess function returned undefined')
          }
        } else return data

      } else return data

    }

    const result = await go()
    // console.debug('Final result:', result)
    return result

  }

  async upvote(generationId: string, config?: MagicConfig): Promise<any> {

    const c = Object.assign({}, this.config, config)

    const data = await post(c.apiUrl, '/upvote', {
      databaseId: c.upvotesDatabaseId,
      generationId
    })

    return data
  }

  // fork(config: MagicConfig): Magic {
  fork(config: MagicConfig, { mergeSpecs }: ForkOptions = {}): Magic {
    // Create a new Magic instance with the same config, but with the new config merged in
    // return new Magic({ ...this.config, ...config })
    return new Magic({
      ...this.config,
      ...config,
      ...(
        mergeSpecs ? {
          specs: { ...this.config.specs, ...config.specs }
        } : {} 
      ) 
    })
  }

  static create(config?: MagicConfig): Magic {
    return new Magic(config)
  }

  static generate(returns: string | string[], input: object, config?: MagicConfig): Promise<any> {
    // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
    // We still need the "config" parameter because they will need to pass in their openaiKey.
    return new Magic(config).generate(returns, input)
  }

}