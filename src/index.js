/* eslint-disable camelcase */

import express from "express";
import path from "path";
import bodyParser from "body-parser";
import axios from "axios";
import { queryService } from "./utils";

require("dotenv").config();

const port = process.env.PORT;
const app = express();
const appToken = process.env.APP_TOKEN;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/service", (req, res) => {
  let custom = false;
  let caption = "";
  let offset = 0;
  let text = req.body.text; // let, not const; not destructured on next line
  const { token, response_url, command } = req.body;
  if (!token || !response_url || !command) {
    return res.status(403);
  }
  if (appToken !== token) {
    return res.status(403);
  }
  if (text === "help") {
    return res.json({
      response_type: "in_channel",
      text: "Type a word or phrase after /morbotron or /frinkiac, and the app will return a captioned screencap from Futurama or the Simpsons, along with a few helpful buttons and suggestions."
    });
  }
  if (text.indexOf("caption:") > -1 && text.indexOf("result:") > -1) {
    custom = true;
    const arrayOfWhole = text.split(" ");
    const indexOfCaption = arrayOfWhole.indexOf("caption:");
    const arrayOfNewCaption = arrayOfWhole.splice(
      indexOfCaption,
      arrayOfWhole.length
    );
    arrayOfNewCaption.shift(); // removes 'caption:'
    caption = arrayOfNewCaption.join(" ");
    const indexOfResult = arrayOfWhole.indexOf("result:");
    const arrayOfResult = arrayOfWhole.splice(
      indexOfResult,
      arrayOfWhole.length
    );
    arrayOfResult.shift(); // removes 'result:'
    offset = parseInt(arrayOfResult[0], 10); // number-as-string in array
    text = arrayOfWhole.join(" ");
  }
  const service = command.replace("/", "");
  queryService(service, text, response_url, offset, caption, custom);
  if (!custom) {
    return res.json({
      response_type: "in_channel",
      text: `${command} searching for ${text}...`
    });
  } else {
    return res.json({
      response_type: "in_channel",
      text: `${service} custom caption comin'...`
    });
  }
});

app.post("/", (req, res) => {
  const { actions, token, response_url, original_message } = JSON.parse(
    req.body.payload
  );
  let text = actions[0].name;
  let offset = actions[0].value;
  const service = original_message.text.split(" ")[0];
  if (appToken !== token) {
    return res.status(403);
  }
  if (text.split("%%%")[1] === "random") {
    text = text.split("%%%")[0];
    offset = Math.floor((Math.random() * 36) + 1);
  }
  queryService(service, text, response_url, offset);
  return res.sendStatus(200);
});

app.get("/oauth", (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect("/");
  }
  // TODO: add a state-check to html and here, for security
  const data = { form: { appToken, code, client_id, client_secret } };
  console.log(data);

  // lifted this .post() from slack engineer's medium blogpost
  // N.B., added appToken above, though.
  axios.post("https://slack.com/api/oauth.access", data, { headers: { "Content-Type": "application/json" } })
    .then((respo) => {
      console.log(respo);
      if (respo.status === 200) {
        const token = respo.data.access_token;
        axios.post("https://slack.com/api/team.info", { form: { token } })
          .then(resbo => {
            if (resbo.status === 200) {
              if (resbo.data.error === "missing_scope") {
                // not sure what's happening here, alas.
                res.send("Added!");
              } else if (resbo.data.error === "invalid code") {
                res.send("bad code!");
              } else {
                const team = resbo.data.team.domain;
                res.redirect(`http://${team}.slack.com`);
              }
            }
          })
          .catch(e => console.log(e));
      } else {
        console.log("bort");
      }
    })
    .catch(gor => console.log("gor!", gor));
});


app.use(express.static(path.join(__dirname, "../public")));
app.listen(port, () => console.log(`Listening on ${port}`)); //eslint-disable-line