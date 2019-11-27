const express = require("express")
const request = require("request-promise-native")
const webhook = express()

// Adds support for GET requests to our webhook
webhook.get("/", (req, res) => {
  console.log("GET /webhook")

  const VERIFY_TOKEN = process.env.verify_token

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

webhook.post("/", async (req, res) => {
  console.log("POST /webhook")

  let body = req.body

  // Checks if this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(entry => {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      const webhookEvent = entry.messaging[0]

      const message = webhookEvent.message
      const senderPsid = webhookEvent.sender.id
      const postback = webhookEvent.postback
      console.log(message)
      console.log(`message text: ${message.text}`)
      console.log(`senderPsid: ${senderPsid}`)

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (message) {
        handleMessage(senderPsid, message)
          .then(() => res.status(200).send("EVENT_RECEIVED"))
          .catch(reason => {
            res.status(500).send("Idk what happened")
            console.error("handleMessage catch()")
          })
      } else if (postback) {
        handlePostback(senderPsid, postback)
          .then(() => res.status(200).send("EVENT_RECEIVED"))
          .catch(reason => {
            res.status(500).send("Idk what happened")
            console.error("handlePostback catch()")
          })
      }
    })
  } else {
    res.status(400).send("Bad Request: Event is not from a page subscription")
  }
})

async function handleMessage(senderPsid, message) {
  let response

  // Check if the message contains text
  if (message.text) {
    // Create the payload for a basic text message
    response = {
      text: `Twoja wiadomość: ${message.text}. Twoja buła jest już w drodze!`
    }
  }

  await send(senderPsid, response)
}

async function handlePostback(senderPsid, postback) {}

async function send(senderPsid, response) {
  const requestBody = {
    recipient: {
      id: senderPsid
    },
    message: response
  }

  // Send the HTTP request to the Messenger Platform
  await request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: process.env.access_token },
      method: "POST",
      json: requestBody
    },
    (err, res, body) => {
      if (!err) {
        console.log("message sent!")
      } else {
        console.error("Unable to send message:" + err)
      }
    }
  )
}

exports.webhook = webhook
