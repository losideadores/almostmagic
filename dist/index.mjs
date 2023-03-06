const DEFAULT_URL = 'https://ideality.app/api/polygon';
async function post(baseUrl = DEFAULT_URL, url, body) {
    // console.log('POST', baseUrl + url, body)
    const response = await fetch(baseUrl + url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    // console.log('response', response)
    if (response.ok) {
        return response.json();
    }
    else {
        throw new Error(response.statusText);
    }
}
const defaultConfig = {
    usdSpent: 0,
    retries: 2
};
export default class Magic {
    config;
    lastMeta = null;
    // getter/setter for usdSpent (so it's easier to access for the user)
    get usdSpent() { return (this.config.externalCostContainer || this.config).usdSpent; }
    set usdSpent(value) { if (this.config.externalCostContainer)
        this.config.externalCostContainer.usdSpent = value;
    else
        this.config.usdSpent = value; }
    constructor(config = defaultConfig) {
        config = { ...defaultConfig, ...config };
        // Rename outputKeys to returns and show a deprecation warning
        if (config.outputKeys) {
            console.warn('Magic: `outputKeys` is deprecated and will be removed in a future version. Please use `returns` instead.');
        }
        this.config = {
            parameters: {},
            ...config,
        };
    }
    async run(slug, variables = {}, parameters = {}, config) {
        const c = Object.assign({}, this.config, config);
        const data = await post(c.apiUrl, '/run', {
            databaseId: c.templatesDatabaseId,
            slug,
            openaiKey: c.openaiKey,
            variables,
            parameters: { ...c.parameters, ...parameters }
        });
        const { approximateCost, tokenCount } = data;
        this.usdSpent += approximateCost;
        this.lastMeta = { approximateCost, tokenCount };
        // TODO: add validate for run() as well
        return data;
    }
    generateFor(input, config) {
        if (!this.config.specs?.returns) {
            throw new Error('Magic: `magic.for(...)` can only be used if `magic.config.specs.returns` is set (either during instantiation or later with `magic.config.specs = { returns: ... }`');
        }
        return this.generate(input, { ...(config || {}), ignoreAmbiguityWarnings: true });
    }
    async generate(returns_or_input, input_or_config = null, config_or_nothing) {
        let input = {};
        let { config } = this;
        let { returns } = this.config?.specs || {};
        switch (arguments.length) {
            case 0:
                if (returns) {
                    // Keeping for easier comparing to other cases 
                }
                else {
                    throw new Error('You must either pass in an returns parameter, or instantiate Magic with { specs: { returns: ... } }');
                }
                break;
            case 1:
                if (returns) {
                    input = returns_or_input;
                    if (!config.ignoreAmbiguityWarnings)
                        console.warn('Magic: Treating the parameter as `input`. To avoid misinterpreting it as `returns`, consider using `magic.generateFor(input)` instead.');
                }
                else {
                    returns = returns_or_input;
                }
                break;
            case 2:
                if (returns) {
                    input = returns_or_input;
                    config = input_or_config;
                    if (!config.ignoreAmbiguityWarnings)
                        console.warn('Magic: Treating first parameter as `input`, and second parameter as `config`, taking `returns` from `config.specs`. To avoid misinterpreting this call as having `returns` for the first parameter, consider using `magic.generateFor(input, config)` instead.');
                }
                else {
                    returns = returns_or_input;
                    input = input_or_config;
                }
                break;
            case 3:
                if (returns) {
                    throw new Error('You can\'t pass in returns twice (both as the first parameter and in the config.specs.returns)');
                }
                else {
                    returns = returns_or_input;
                    input = input_or_config;
                    config = config_or_nothing;
                }
                break;
        }
        const c = Object.assign({}, this.config, config);
        const { openaiKey, apiUrl, descriptor, specs, examples, parameters, retries, optionalReturns } = c;
        // const go = async (retriesLeft: number = retries || 2 ) => {
        const go = async (lastArray = [], retriesLeft = retries || 2) => {
            let data = await post(apiUrl, '/generate' + (descriptor ? `/${descriptor}` : ''), {
                returns,
                input,
                openaiKey,
                specs,
                examples,
                parameters,
                optionalReturns,
                retries
            });
            const { approximateCost, tokenCount } = data._meta || data;
            this.usdSpent += approximateCost;
            this.lastMeta = { approximateCost, tokenCount };
            data = data._meta ? data : data.choices;
            // If there was just one return, return the value instead of the object (or array of values instead of array of objects, if there are multiple choices)
            if (typeof returns === 'string' && !c.alwaysReturnObject) {
                // We can't just use returns as a key because the server camelCases it, so we have to just take the only key from the object
                const onlyValue = (object) => object[Object.keys(object)[0]];
                data = Array.isArray(data) ? data.map(d => onlyValue(d)) : onlyValue(data);
            }
            // console.debug('Data:', data)
            if (c.postprocess) {
                const { postprocess } = c;
                const processed = (data) => {
                    try {
                        // Create a dataWithoutMeta object that doesn't have the _meta property
                        const { _meta, ...dataWithoutMeta } = data;
                        // Postprocess the data, and then add the _meta property back
                        return { ...postprocess(dataWithoutMeta), _meta };
                    }
                    catch (e) {
                        if (retriesLeft > 0)
                            console.warn(e);
                    }
                };
                if (Array.isArray(data)) {
                    data = [...lastArray, ...data.map(processed).filter(d => d !== undefined)];
                }
                else {
                    data = processed(data);
                }
                if (data === undefined || Array.isArray(data) && data.length === 0) {
                    if (retriesLeft > 0) {
                        console.warn('Retrying...');
                        return go(data, retriesLeft - 1);
                    }
                    else {
                        throw new Error('Postprocess function returned undefined');
                    }
                }
                else
                    return data;
            }
            else
                return data;
        };
        const result = await go();
        // console.debug('Final result:', result)
        return result;
    }
    async upvote(generationId, config) {
        const c = Object.assign({}, this.config, config);
        const data = await post(c.apiUrl, '/upvote', {
            databaseId: c.upvotesDatabaseId,
            generationId
        });
        return data;
    }
    // fork(config: MagicConfig): Magic {
    fork(config, { mergeSpecs } = {}) {
        // Create a new Magic instance with the same config, but with the new config merged in
        // return new Magic({ ...this.config, ...config })
        return new Magic({
            ...this.config,
            ...config,
            ...(mergeSpecs ? {
                specs: { ...this.config.specs, ...config.specs }
            } : {})
        });
    }
    static create(config) {
        return new Magic(config);
    }
    static generate(returns, input, config) {
        // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
        // We still need the "config" parameter because they will need to pass in their openaiKey.
        return new Magic(config).generate(returns, input);
    }
}
