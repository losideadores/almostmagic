# It’s magic! Well, almost.

## What is this?

**almostmagic** is a library that lets you generate *structured* string data using AI with a single Line of code (okay, maybe two lines).

Under the hood, the library is a wrapper around the [OpenAI API](https://openai.com/api/), but, unlike the API, it’s easy to use and doesn’t require you to know anything about “prompt engineering.” You just use a function where you say what you want to generate and what you want to use as input, and it does the rest.

This way, you can quickly integrate AI capabilities for all kinds of small things (or big things, for that matter), for example:

* Building a tweet scheduler? Use **almostmagic** to provide tweet ideas for your users based on their Twitter bio.
* Shipping a document editor? Use **almostmagic** to auto-name your users’ documents.
* Making a to-do list app? Use **almostmagic** to suggest new tasks based on the user’s current tasks.

And so on, with your own imagination being the only limit.

Isn’t that magic? Well, at least almost?

## Install

```shell
npm install almostmagic
```

## Use

One-line API:

```js
await Magic.generate(outputKeys, input, { openaiKey })
```

where
* `outputKeys` is a string or an array of strings, e.g. `"tweet"` to generate a tweet or `["blogTitle", "intro", "outline"]` to generate a title, an intro, and an outline for an article.
* `input` is an object with arbirary keys and values. For example, if you want to generate a tweet, these could refer to the author’s Twitter bio and location, etc. in the format `{ bio: "I'm a software engineer", location: "San Francisco" }`, while for an article it might be `{ topic: "JavaScript", tone: "helpful and friendly" }`.
* `openaiKey` is your OpenAI API key (see note below).

## Examples

### Using the class as the simplest way to generate anything

```js
const { Magic } = require('almostmagic')
// import Magic from 'almostmagic' // <-- if you're using ES6 modules -- NOT TESTED YET!

let { quote, voiceActor, _meta } = await Magic.generate(
  ["quote", "voiceActor"],
  {
    topic: "artificial intelligence",
    mood: "silly and funny",
    instruction: "voiceActor should be a celebrity with a recognizable voice."
  }, { openaiKey: 'sk-...' }
)

console.log({ quote, voiceActor, _meta })
```

Notes:
* The response is an object with keys corresponding to the `outputKeys` you passed in, plus a `_meta` key with some metadata about the request.
* The `_meta.approximateCost` property of the response object is the approximate cost of your OpenAI request **in US dollars**. We say “approximate” to avoid taking responsibility, but it’s usually pretty accurate as it’s based on the number of tokens in the prompt. Make sure to check the [Usage](https://beta.openai.com/account/usage) section of your OpenAI dashboard to see the actual cost of your requests, though.
* For the time being, you need to have an OpenAI key to use this library (later on we will introduce our own token system). You can get one [here](https://beta.openai.com/account/api-keys). We do not store your keys but only use it to (a) make requests to the OpenAI API (b) use their SHA256 (an irreversible hash function) to track usage with Mixpanel. You can find the server-side code [here](https://github.com/vzakharov/ideality-nuxt/blob/master/api/polygon/index.coffee#L340) to be sure we’re not doing anything shady.
* In its basic form, the API is **very** cheap. It will take like 1000 requests a day to spend the price of a cup of coffee. Note that the price depends on the amount of information you submit and ask for, so it’s not a fixed number. So, for example, generating a tweet will cost a fraction of a cent, while generating a summary of a 1000-word article will cost a few cents.

Tips:
* Try making the input and output keys self-explanatory, so that AI can understand what you want better.
* Use `instruction` (or any other similar key) to help the AI understand what you want.
* Experiment adding other keys to the input object, like `language` or `intent` or whatever you can think of, or to the output keys, e.g. `explanation` or `emoji`.

¹ Imports and splitting code into several lines for readability doesn’t count as multiple lines, right? Right?

### Using an instance for tracking costs and avoiding passing the key every time


```js
const magic = new Magic({
  openaiKey: 'sk-...'
})


let reponse = await magic.generate(
  "tweet",
  {
    author: "tibo_maker",
    authorBio: `Building http://tweethunter.io & http://taplio.com 🚢 sharing all my learnings about startups & audience building 👋 Sold 2 startups, crashed way more 💪`,
    topic: "getting dengue fever while nomading in Bali",
    mood: "upbeat and very French"
  }
)

console.log(response)

response = await magic.generate(
  ["title", "intro", "outline"],
  {
    topic: "will AI kill us all?",
    tone: "playful and irreverent",
    commentary: "outline must be an array of strings",
  }
)

console.log(response)

console.log(`\nTotal cost of requests so far: $${magic.usdSpent.toFixed(2)}`)
```

Notes:
* You can initialize the `Magic` class with an `openaiKey` and a `usdSpent` property, so you can keep track of the total cost of your requests across sessions (e.g. take them from localStorage, a database, etc.), and avoid passing the key every time.
* You can use a string instead of an array if you only want one output. Note that the result will still be an object with `[yourKey]` and `_meta` keys (for consistency).

### Advanced usage

There is much more you can do with the API, like tweaking the parameters of the OpenAI request and even writing your own sophisticated prompts with `{{placeholders}}` used to insert the input values — but that’s a story for another day. Watch this repo for updates!

## Playground

There’s a [playground](https://vzakharov.github.io/polygon/) where you can try some examples, generate new ones (yes, also using AI), and see the code you need to copy-paste to use whatever you come up with in your code.

Now go on, make things, break things, and keep the fuckin’ magic alive! 🪄

~[Vova](https://twitter.com/vovahimself) and [David](https://twitter.com/davipar) (with a lot of help from [Dima](https://twitter.com/dchest))