const express = require("express")
const webhook = express()

// Adds support for GET requests to our webhook
webhook.get("/", (req, res) => {
  console.log("Hi there webhook GET")

  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN

  // Parse the query params
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED")
      res.status(200).send(challenge)
      // res.status(200).send("OK")
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.status(403).send("Forbidden")
    }
  } else res.status(400).send("Bad Request")
})

webhook.post("/", (req, res) => {
  console.log("Hi there webhook GET")

  let body = req.body

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(entry => {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhookEvent = entry.messaging[0].message
      console.log(webhookEvent)
    })

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED")
  } else {
    res.status(400).send("Bad Request: Event is not from a page subscription")
  }
})

// // Sets server port and logs message on success
// app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"))

exports.webhook = webhook
