# It’s almost magic, dammit!

## Install

```shell
npm install almostmagic
```

## Use

```js
const Magic = require('almostmagic').default
// or import Magic from 'almostmagic' if you're using ES6 modules -- NOT TESTED YET!

const openaiKey = "sk-..."
// Your OpenAI (GPT-3) key, get it here: https://beta.openai.com/account/api-keys
// We do not store your keys but only use it to make requests to the OpenAI API
// (We also make a SHA256 hash of your key to track usage with Mixpanel)
// You can find the server-side code here so you can be sure we're not doing anything shady: https://github.com/vzakharov/ideality-nuxt/blob/master/api/polygon/index.coffee#L340

go()

async function go() {

  // Quote by a famous actor based on a topic

  const { quote, voiceActor, _meta } = await Magic.generate(
    ["quote", "voiceActor"], // Try making the output keys self-explanatory, so that AI can understand what you want better. 
    {
      topic: "something stupid and funny", // It doesn't have to be, but it's stupider and funnier this way, right?
      commentary: "voiceActor should be a celebrity with a recognizable voice." // Note how you can use arbitrary comments to help the AI understand what you want
    }, { openaiKey }
  )

  console.log("\nHere's a stupid and funny quote by a random famous actor:\n")
  console.log({ fullQuote: `“${quote}” — ${voiceActor}\n\n`, _meta })

  // _meta.approximateCost is in dollars, so it's also pretty cheap for simpler use cases. Thank our smart-ass GPT-3 prompt that we're keeping in a safe in a Swiss bank vault.

  // You can keep track of the total cost of your requests with the `magic.usdSpent` instance property:
  const magic = new Magic({
    openaiKey,
    usdSpent: _meta.approximateCost // You can instantiate the magic instance with a starting value for usdSpent, so you can track costs over multiple sessions
  })

  // Tweet based on a user handle, bio and a topic
  console.log("\n\nHere's a tweet generated based on a user handle, bio and a topic:\n")

  await magic.generate(
    "tweet",  // Note that you can pass a string instead of an array if you only want one output
    {
      author: "tibo_maker",
      authorBio: `Building http://tweethunter.io & http://taplio.com 🚢 sharing all my learnings about startups & audience building 👋 Sold 2 startups, crashed way more 💪`,
      topic: "getting dengue fever while nomading in Bali",
      mood: "upbeat and very French"
    } // Note that now you don't need to specify the openaiKey, because you already did it when you created the magic instance
  ).then(console.log)

  console.log(`\nTotal cost of requests so far: $${magic.usdSpent.toFixed(2)}`)

  // Blog title, intro and outline based on a topic
  console.log("\n\nHere's a blog title, intro and outline based on a topic:\n")

  await magic.generate(
    ["title", "intro", "outline"],
    {
      topic: "will AI kill us all?",
      tone: "playful and irreverent",
      commentary: "outline must be an array of strings",
    }
  ).then(console.log)

  console.log(`\nFinal total cost of requests: $${magic.usdSpent.toFixed(2)}`)
  console.log(`\n\nTHAT'S RIGHT -- ${Math.round(magic.usdSpent * 10000) / 100} FUCKING CENTS TO HAVE SO MUCH FUN! IMAGINE WHAT THIS CAN DO FOR YOUR USERS!`)

  console.log(`\n\nNow go and make something awesome! Here’s a playground to tweak and break things: https://vzakharov.github.io/polygon/`)

}
```

## Notes

In case you missed it in the code above:

* You can generate almost any text in a structured key-value format, at a ridiculously low cost. It will take like 1000 requests a day to spend the price of a cup of coffee. (At least if you're not trying to feed it with a 1000-page novel.)

* We use your OpenAI key to make requests to the OpenAI API. We do not store your keys butmake a SHA256 hash of it to track usage with Mixpanel. You can find the server-side code [here](https://github.com/vzakharov/ideality-nuxt/blob/master/api/polygon/index.coffee#L340) so you can be sure we're not doing anything shady.

* There’s a [playground](https://vzakharov.github.io/polygon/) where you can try it all out. (It has another name in the header but that’s a story for another day.)

So, enjoy, break things, and keep the fuckin’ magic alive! 🪄

~[Vova](https://twitter.com/vovahimself) and [David](https://twitter.com/davipar) (with a lot of help from [Dima](https://twitter.com/dchest))

---

# For the most vigilant: **[Playground](https://vzakharov.github.io/polygon/)** to try it out.
