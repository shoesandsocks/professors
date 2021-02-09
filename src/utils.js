/* eslint-disable quote-props, camelcase */
import axios from "axios";

require("dotenv").config();

// two helper fns
const encode = (str) => encodeURIComponent(str).replace(/%20/g, "+");
const sendError = (response_url, service) =>
  axios.post(response_url, {
    response_type: "ephemeral",
    text: `_Something went wrong with ${service}, sorry._`,
  });

export default function queryService(
  service,
  q,
  response_url,
  offset = 0,
  caption = undefined,
  custom = false
) {
  const lineLength = service === "frinkiac" ? 28 : 24;
  axios
    .get(`https://${service}.com/api/search?q=${q}`)
    .then((response) => {
      const shortlist = response.data.splice(offset, 1);
      const { Episode, Timestamp } = shortlist[0];
      shortlist[0].image_url = `https://${service}.com/img/${Episode}/${Timestamp}.jpg`;

      const captionURL = `https://${service}.com/api/caption?e=${Episode}&t=${Timestamp}`;
      axios
        .get(captionURL)
        .then((rep) => {
          // stealing this pattern from the hubot-frinkiac
          let line = "";
          const lines = [];
          let subs = rep.data.Subtitles.map((s) => s.Content)
            .join(" ")
            .split(" ");

          // insert override caption here, eventually
          if (caption && typeof caption === "string") {
            subs = caption.split(" ");
          }
          while (subs.length > 0) {
            const word = subs.shift();
            if (line.length === 0 || line.length + word.length <= lineLength) {
              line += ` ${word}`;
            } else {
              lines.push(line);
              line = "";
              subs.unshift(word);
            }
          }
          if (line.length > 0) {
            lines.push(line);
          }
          const joined = lines.join("\n");
          const encoded = encode(joined);
          const memeURL = `https://${service}.com/meme/${Episode}/${Timestamp}.jpg?lines=${encoded}`;
          const generatorPageURL = `https://${service}.com/caption/${Episode}/${Timestamp}`;
          shortlist[0].memeURL = memeURL;
          let attachments = [
            {
              text: "",
              image_url: memeURL,
              color: "good",
              callback_id: "results-buttons",
              actions: [
                {
                  name: `${q}`,
                  text: "Next result",
                  type: "button",
                  value: parseInt(offset, 10) + 1,
                },
                {
                  name: `${q}%%%random`,
                  text: "Random result",
                  type: "button",
                  value: parseInt(offset, 10) + 1,
                },
              ],
            },
            {
              text: `${service} page for this caption: ${generatorPageURL}`,
              color: "warning",
            },
            {
              text: `${service} search page for "${q}": https://${service}.com/?q=${encodeURIComponent(
                q
              )}`,
              color: "danger",
            },
            {
              text: `DIY caption like so: "/${service} ${q} result: ${offset} caption: clever words"`,
              color: "good",
            },
          ];
          if (custom) {
            attachments = [
              {
                text: "",
                image_url: memeURL,
                color: "good",
              },
            ];
          }
          const completePostObject = {
            response_type: "in_channel",
            text: `${service} result #${offset} for "${q}"`,
            attachments: attachments,
          };
          if (custom) {
            completePostObject.text = `custom ${service} result for ${q}`;
          }
          axios
            .post(response_url, completePostObject)
            .then(() => console.log("posted"))
            .catch(() => console.log("error posting response to slack"));
        })
        .catch(() => sendError(response_url, service));
    })
    .catch(() => sendError(response_url, service));
}
