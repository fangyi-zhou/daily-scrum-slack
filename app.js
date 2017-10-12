const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const schedule = require('node-schedule');

const bot_token = process.env.SLACK_BOT_TOKEN || '';
const web_token = process.env.SLACK_API_TOKEN || '';

const rtm = new RtmClient(bot_token);
const web = new WebClient(web_token);

let uidToName = {};
let nameToUid = {};
let userToDM = {};
let DMToUser = {};
let userInReport = {};
let userReport = {};
let lastDigest;

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


function getDigest() {
    let digest = "";
    Object.keys(userReport).forEach( (uid) => {
        digest += "@" + uidToName[uid] + ": " + userReport[uid] + "\n";
    });
    if (digest === "") {
        digest = "No digest available.";
    }
    return digest;
}

let scrumChannel;

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    for (const c of rtmStartData.channels) {
        if (c.name === "scrum") {
            scrumChannel = c.id;
        }
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
    Object.keys(userToDM).forEach( (uid) => {
        const channel = userToDM[uid];
        if (uid !== rtm.activeUserId && userInReport[uid] === undefined) {
            rtm.sendMessage("Hi. You have not submitted your scrum report yet. Don't forget to do that before 7am.", channel);
        }
    })
}

const morningDigestJob = schedule.scheduleJob("* 10 * * 1-5", () => {
    morningDigest();
});

const clearReportJob = schedule.scheduleJob("* 7 * * 1-5", () => {
    clearReport();
});

const remindPeopleJob = schedule.scheduleJob("* 23 * * 1-5", () => {
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
        morningDigest();
        res.status(200).end();
    }
});
app.listen(process.env.PORT);

const http = require("http");
setInterval(() => {
    http.get("http://daily-scrum-slack.herokuapp.com");
}, 300000);
