require("dotenv").config()

console.log(`Token: ${process.env.token}`)

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

exports.bot = functions.https.onRequest(main)
