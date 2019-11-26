const functions = require("firebase-functions")
const bodyParser = require("body-parser")
const express = require("express")
const webhook = require("./webhook").webhook
const main = express()

main.use(bodyParser.json())

main.get("/", (req, res) => {
  console.log("Main entry point hit!")
  res.status(200).send("Main entry point hit!")
})

main.use("/webhook", webhook)

// http://localhost:5000/frycz-kolejka-bot/us-central1/bot
// https://firebase.google.com/docs/functions/write-firebase-functions
// curl -X GET "http://localhost:5000/frycz-kolejka-bot/us-central1/bot/webhook?hub.verify_token=tiger123&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe"
// curl -H "Content-Type: application/json" -X POST "http://localhost:5000/frycz-kolejka-bot/us-central1/bot/webhook" -d '{"object": "page", "entry": [{"messaging": [{"message": "TEST_MESSAGE"}]}]}'

exports.bot = functions.https.onRequest(main)
