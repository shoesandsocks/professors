/* eslint-disable no-console */

import express from "express";
import path from "path";
import bodyParser from "body-parser";
import request from "request";
import { queryService } from "./utils";

require("dotenv").config();

const port = process.env.PORT;
const app = express();
const appToken = process.env.APP_TOKEN;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/service", (req, res) => {
  console.log(req.body);
  let custom = false;
  let caption = "";
  let offset = 0;
  let text = req.body.text;
  const { token, response_url, command } = req.body;
  const service = command.replace("/", "");
  if (appToken !== token) {
    return res.status(403);
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
  const data = { form: { code, clientId, clientSecret } };
  request.post(
    "https://slack.com/api/oauth.access",
    data,
    (cbErr, respo, body) => {
      console.log("body" + JSON.parse(body));
      if (!cbErr && respo.statusCode === 200) {
        const token = JSON.parse(body).access_token;
        request.post(
          "https://slack.com/api/team.info",
          { form: { token } },
          (error, response, bod) => {
            if (!error && response.statusCode === 200) {
              if (JSON.parse(bod).error === "missing_scope") {
                res.send("Added!");
              } else {
                console.log(JSON.parse(bod));
                const team = JSON.parse(bod).team.domain;
                res.redirect(`http://${team}.slack.com`);
              }
            }
          }
        );
      }
    }
  );
});

app.use(express.static(path.join(__dirname, "../public")));
app.listen(port, () => console.log(`Listening on ${port}`));
