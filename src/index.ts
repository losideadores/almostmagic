const DEFAULT_URL = 'https://ideality.app/api/polygon'

async function post(baseUrl: string = DEFAULT_URL, url: string, body: object) {

  console.log({baseUrl, url}, body)

  const response = await fetch(baseUrl + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  // console.log({response})

  if (response.ok) {
    return response.json()
  } else {
    throw new Error(response.toString())
  }

}

export interface MagicConfig {
  apiUrl?: string
  templatesDatabaseId?: string
  upvotesDatabaseId?: string
  openaiKey?: string
  defaultParameters?: object
  usdSpent?: number
  keyForGuidelines?: string
}

interface LooseObject {
  [key: string]: any
}

export class Magic {

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

    const c = Object.assign({}, this.config, config)
    
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

  async generate(outputKeys: string | string[], input: LooseObject, config: MagicConfig = {}) {

    const c = Object.assign({}, this.config, config)

    if (!Array.isArray(outputKeys)) {

      // If string, turn into array
      if (typeof outputKeys === 'string') {
        outputKeys = [outputKeys]
      }
      // If object, turn into array of keys while adding the object under the [keyForGuidelines] key in the input, defaulting to "guidelines"
      else if (typeof outputKeys === 'object') {
        const { keyForGuidelines = 'guidelines' } = c
        // If there is already a key in the input with the same name as the keyForGuidelines, throw an error
        if ( input[keyForGuidelines] ) {
          throw new Error(`You cannot use the key "${keyForGuidelines}" in your input object when outputKeys is an object. Please either change the keyForGuidelines config option or change the key in your input object.`)
        }
        input[keyForGuidelines] = outputKeys
        outputKeys = Object.keys(outputKeys)
      }
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

  static generate(outputKeys: string | string[], input: LooseObject, config: MagicConfig = {}) {
    // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
    // We still need the "config" parameter because they will need to pass in their openaiKey.
    return new Magic(config).generate(outputKeys, input)
  }

}

export default Magic