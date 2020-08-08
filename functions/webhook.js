const admin = require("firebase-admin")
const express = require("express")
const request = require("request-promise-native")
const webhook = express()

const firestore = admin.firestore()

// Adds support for GET requests to our webhook - only needed for verification
webhook.get("/", (req, res) => {
  console.log("GET /webhook")

  const VERIFY_TOKEN = process.env.verify_token

  // Parse the query params
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  console.log(mode, token, challenge)
  console.log(VERIFY_TOKEN)

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

// Handle actual messages from users
webhook.post("/", async (req, res) => {
  console.log("POST /webhook")

  // Checks if this is an event from a page subscription
  if (req.body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    req.body.entry.forEach((entry) => {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      const webhookEvent = entry.messaging[0]

      const message = webhookEvent.message
      const senderPsid = webhookEvent.sender.id
      const postback = webhookEvent.postback

      console.log(`senderPsid: ${senderPsid}`)

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (message) {
        console.log(`message text: ${message.text}`)

        handleMessage(senderPsid, message)
          .then(() => res.status(200).send("EVENT_RECEIVED"))
          .catch((reason) => {
            res.status(500).send("Idk what happened")
            console.error("handleMessage catch()", reason)
          })
      } else if (postback) {
        handlePostback(senderPsid, postback)
          .then(() => res.status(200).send("EVENT_RECEIVED"))
          .catch((reason) => {
            res.status(500).send("Idk what happened")
            console.error("handlePostback catch()", reason)
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
      text: `Twoja zamówienie: ${message.text}. Zapisano w bazie oczekujących. Cierpliwości ;)`,
    }

    const userResponse = await request(
      `https://graph.facebook.com/${senderPsid}?fields=first_name,last_name,profile_pic&access_token=${process.env.access_token}`
    )

    const user = JSON.parse(userResponse)

    const username = `${user.first_name} ${user.last_name}`
    console.log(`username: ${username}`)

    await firestore.collection("orders").doc().create({
      orderer: username,
      order: message.text,
      timestamp: new Date().getTime(),
    })
  } else if (message.attachments) {
    let attachmentUrl = message.attachments[0].payload.url

    response = {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Is this the right picture?",
              subtitle: "Tap a button to answer.",
              image_url: attachmentUrl,
              buttons: [
                {
                  type: "postback",
                  title: "Yes!",
                  payload: "yes",
                },
                {
                  type: "postback",
                  title: "No!",
                  payload: "no",
                },
              ],
            },
          ],
        },
      },
    }
  }

  await send(senderPsid, response)
}

async function handlePostback(senderPsid, postback) {
  let response

  // Get the payload for the postback
  let payload = postback.payload

  // Set the response based on the postback payload
  if (payload === "yes") {
    response = { text: "Thanks!" }
  } else if (payload === "no") {
    response = { text: "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  await send(senderPsid, response)
}

async function send(senderPsid, response) {
  const requestBody = {
    recipient: {
      id: senderPsid,
    },
    message: response,
  }

  // Send the HTTP request to the Messenger Platform
  await request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: process.env.access_token },
      method: "POST",
      json: requestBody,
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
