const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const bot_token = process.env.SLACK_BOT_TOKEN || '';
const web_token = process.env.SLACK_API_TOKEN || '';

const rtm = new RtmClient(bot_token);
const web = new WebClient(web_token);

let uidToName = {};
let nameToUid = {};
let userToDM = {};
let DMToUser = {};
let userInReport = {};

web.users.list((err, info) => {
    if (err) {
        console.log(err);
    } else {
        for (const user of info.members) {
            uidToName[user.id] = user.name;
            nameToUid[user.name] = user.id;
        }
    }
});

web.im.list((err, info) => {
    if (err) {
        console.log(err);
    } else {
        for (const im of info.ims) {
            userToDM[im.user] = im.id;
            DMToUser[im.id] = im.user;
        }
    }
});

let scrumChannel;

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    for (const c of rtmStartData.channels) {
        if (c.is_member && c.name === "scrum") {
            scrumChannel = c.id;
        }
    }
});

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
});

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {
    if (msg.channel === scrumChannel && msg.text === "digest") {
        rtm.sendMessage("TODO: Send digest", scrumChannel);
    }
    if (msg.channel.startsWith("D") && msg.user !== rtm.activeUserId) {
        if (userInReport[msg.user]) {
            const report = msg.text;
            // TODO: Store in database
            userInReport[msg.user] = false;
            rtm.message("Report recorded. Thanks!", msg.channel);
            return;
        }
        if (msg.text === "report") {
            rtm.sendMessage("Please reply with your report for today", msg.channel);
        } else if (msg.text === "view") {
            // TODO: Query database
            rtm.sendMessage("You have not submitted your record for today", msg.channel);
        } else {
            rtm.sendMessage("Usage: view | report ", msg.channel);
        }
    }
});

rtm.start();

const express = require('express');
const app = express();
app.listen(process.env.PORT);
