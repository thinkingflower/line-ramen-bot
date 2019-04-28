const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.PROJECT_ID,
  "private_key_id": process.env.PRIVATE_KEY_ID,
  "private_key": process.env.PRIVATE_KEY,
  "client_email": process.env.CLIENT_EMAIL,
  "client_id": process.env.CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.CLIENT_CERT
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ramenbot-b6fd9.firebaseio.com"
});

const db = admin.database();


const config = {
  channelAccessToken: process.env.LINE_CHANNEL_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
app.post('*', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

const client = new line.Client(config);
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  const mention = event.message.text
  const userId = event.source.userId
  const userProfile = await client.getProfile(userId)
  const userName = userProfile.displayName
  const userRef = db.ref(userId)
  let reply = ''
  if (!mention.endsWith('行ったよ') && mention !== "参照") {
    return Promise.resolve(null);
  }

  if (mention.endsWith('行ったよ')) {

    const endofmention = mention.indexOf('行ったよ')
    const shopname = mention.slice(0, endofmention).trim()

    const data = await userRef.once('value')
    const ramenData = data.val()
    let ramenCount = 0
    if (ramenData !== null){
     ramenCount = ramenData[shopname] ? ramenData[shopname] : 0
    }
    ramenCount += 1
    userRef.update({
      [shopname]: ramenCount
    })
    reply = shopname + "へは " + ramenCount + " 回行きました" 
  }
  if (mention === "参照"){
    const data = await userRef.once('value')
    const ramenData = data.val()
    let refercount = ""
    if (ramenData === null){
      return Promise.resolve(null);
    }
    Object.keys(ramenData).forEach(function (shopname){
      refercount += "\n" + shopname + "へ " + ramenData[shopname] + " 回"  
    })
    reply = `${userName}さん${refercount}`
  } 

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply
  });          
}
module.exports = app