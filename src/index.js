/* eslint-disable no-console */

import express from "express";
import path from "path";
import bodyParser from "body-parser";
import { queryService } from "./utils";

require("dotenv").config();

const port = process.env.PORT;
const app = express();
const appToken = process.env.APP_TOKEN;

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
    // console.log(arrayOfWhole);
    const indexOfCaption = arrayOfWhole.indexOf("caption:");
    const arrayOfNewCaption = arrayOfWhole.splice(indexOfCaption, arrayOfWhole.length);
    // console.log(arrayOfNewCaption);
    arrayOfNewCaption.shift(); // removes 'caption:'
    caption = arrayOfNewCaption.join(" ");
    // console.log(newCaption);
    const indexOfResult = arrayOfWhole.indexOf("result:");
    const arrayOfResult = arrayOfWhole.splice(indexOfResult, arrayOfWhole.length);
    // console.log(arrayOfResult);
    arrayOfResult.shift(); // removes 'result:'
    offset = parseInt(arrayOfResult[0], 10); // number-as-string in array
    // console.log(offset);
    text = arrayOfWhole.join(" ");
  }
  queryService(service, text, response_url, offset, caption, custom);
  return res.json({
    "response_type": "in_channel",
    "text": `${command} searching for ${text}...`
  });
});

app.post("/", (req, res) => {
  const { actions, token, response_url, original_message } = JSON.parse(req.body.payload);
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

app.use(express.static(path.join(__dirname, "../public")));
app.listen(port, () => console.log(`Listening on ${port}`));
