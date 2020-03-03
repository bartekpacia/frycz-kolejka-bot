require("dotenv").config()

console.log(`Verify token: ${process.env.verify_token}`)
console.log(`Access token: ${process.env.access_token}`)

const admin = require("firebase-admin")
admin.initializeApp()

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

main.use(
  "/webhook",
  (req, res) => {
    console.log("Webhook hit!")
  },
  webhook
)

exports.bot = functions.https.onRequest(main)
