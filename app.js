const RtmClient = require('@slack/client').RtmClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const schedule = require('node-schedule');
const request = require('request');

const bot_token = process.env.SLACK_BOT_TOKEN || '';
const web_token = process.env.SLACK_API_TOKEN || '';

const rtm = new RtmClient(bot_token);

let userInReport = {};
let userReport = {};
let lastDigest;

function getDigest() {
    let digest = "";
    Object.keys(userReport).forEach( (uid) => {
        digest += "@" + users[uid].name + ": " + userReport[uid] + "\n";
    });
    if (digest === "") {
        digest = "No digest available.";
    }
    return digest;
}

let scrumChannel;
let ims = {};
let users = {};

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    for (const c of rtmStartData.channels) {
        if (c.name === "scrum") {
            scrumChannel = c.id;
        }
    }
    for (const im of rtmStartData.ims) {
        ims[im.user] = im.id;
    }
    for (const user of rtmStartData.users) {
        users[user.id] = user;
    }
});

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
});

rtm.on(RTM_EVENTS.MESSAGE, (msg) => {
    if (msg.channel === scrumChannel && msg.text === "digest") {
        const digest = getDigest();
        rtm.sendMessage(digest, msg.channel);
        return;
    }
    if (msg.channel.startsWith("D") && msg.user !== rtm.activeUserId) {
        console.log("Received message from " + msg.channel + " from " + msg.user);
        if (userInReport[msg.user]) {
            const report = msg.text;
            userReport[msg.user] = report;
            userInReport[msg.user] = false;
            rtm.sendMessage("Report recorded. Thanks!", msg.channel);
            return;
        }
        if (msg.text === "report") {
            userInReport[msg.user] = true;
            rtm.sendMessage("Please reply with your report for today", msg.channel);
        } else if (msg.text === "view") {
            rtm.sendMessage(userReport[msg.user] === undefined ?
                "You have not submitted your record for today" :
                userReport[msg.user], msg.channel);
        } else {
            rtm.sendMessage("Usage: `view` | `report` ", msg.channel);
        }
    }
});

rtm.start();

function morningDigest() {
    if (lastDigest === undefined) {
        lastDigest = getDigest();
    }
    rtm.sendMessage("Good morning, this is the morning digest\n" + lastDigest, scrumChannel);
}

function clearReport() {
    lastDigest = getDigest();
    userReport = {};
    userInReport = {};
}

function remindPeople() {
    Object.keys(ims).forEach( (uid) => {
        const channel = ims[uid];
        if (uid !== rtm.activeUserId && userReport[uid] === undefined) {
            rtm.sendMessage("Hi. You have not submitted your scrum report yet. Don't forget to do that before 7am.", channel);
            console.log("Reminded " +  users[uid].name + " on " + channel);
        }
    })
}

const morningDigestJob = schedule.scheduleJob("0 10 * * 1-5", () => {
    morningDigest();
});

const clearReportJob = schedule.scheduleJob("0 7 * * 1-5", () => {
    clearReport();
});

const remindPeopleJob = schedule.scheduleJob("0 23 * * 1-5", () => {
    remindPeople()
});

const express = require('express');
const bodyParser = require('body-parser');
const urlEncodedParser = bodyParser.urlencoded( { extended: false } );
const app = express();
app.use(urlEncodedParser);
app.post("/morningdigest", (req, res) => {
    const body = req.body;
    if (body.token !== process.env.VERIFICATION_TOKEN) {
        res.status(403).end();
    } else {
        const reply = body.response_url;
        if (lastDigest === undefined) {
            lastDigest = getDigest();
        }
        request({
            url: reply,
            method: 'POST',
            body: {
                text: lastDigest
            },
            json: true
        }, (err) => {
            if (err) console.log(err);
            res.status(err ? 500: 200).end();
        });
    }
});
app.listen(process.env.PORT);

const http = require("http");
setInterval(() => {
    http.get("http://daily-scrum-slack.herokuapp.com");
}, 300000);
