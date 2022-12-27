"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_URL = 'https://ideality.app/api/polygon';
async function post(baseUrl = DEFAULT_URL, url, body) {
    const response = await fetch(baseUrl + url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (response.ok) {
        return response.json();
    }
    else {
        throw new Error(response.statusText);
    }
}
class Magic {
    // getter/setter for usdSpent (so it's easier to access for the user)
    get usdSpent() { return this.config.usdSpent; }
    set usdSpent(value) { this.config.usdSpent = value; }
    constructor(config = {}) {
        this.config = {
            usdSpent: 0,
            defaultParameters: {},
            ...config
        };
    }
    async run(slug, variables = {}, parameters = {}, config = {}) {
        const c = Object.assign({}, this.config, config);
        const data = await post(c.apiUrl, '/run', {
            databaseId: c.templatesDatabaseId,
            slug,
            openAIkey: c.openaiKey,
            // TODO: change the way `openAIkey` is spelled on the server
            variables,
            parameters: { ...c.defaultParameters, ...parameters }
        });
        this.usdSpent += data.approximateCost;
        return data;
    }
    async generate(outputKeys, input, config = {}) {
        const c = Object.assign({}, this.config, config);
        if (!Array.isArray(outputKeys)) {
            outputKeys = [outputKeys];
        }
        const data = await post(c.apiUrl, '/generate', {
            outputKeys,
            input,
            openAIkey: c.openaiKey,
        });
        this.usdSpent += data._meta.approximateCost;
        return data;
    }
    async upvote(generationId, config = {}) {
        const c = Object.assign({}, this.config, config);
        const data = await post(c.apiUrl, '/upvote', {
            databaseId: c.upvotesDatabaseId,
            generationId
        });
        return data;
    }
    static create(config = {}) {
        return new Magic(config);
    }
    static generate(outputKeys, input, config = {}) {
        // (So that you can call Magic.generate() without creating a new instance. We don't do this for run() or upvote() because they are more advanced functions, but with generate we want to give people a way to instantly "feel the magic".)
        // We still need the "config" parameter because they will need to pass in their openaiKey.
        return new Magic(config).generate(outputKeys, input);
    }
}
exports.default = Magic;
