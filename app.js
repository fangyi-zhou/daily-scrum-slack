const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const bot_token = process.env.SLACK_BOT_TOKEN || '';

const rtm = new RtmClient(bot_token);

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
});

rtm.start();

const express = require('express');
const app = express();
app.listen(process.env.PORT);