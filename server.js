const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const ONESIGNAL_APP_ID = "50e33082-20dd-4bbf-a4d0-62a9b9c151a0";
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY || "os_v2_app_kdrtbara3vf37jgqmku3tqkrubk6gnr5mxsubkmaova7kibxofu6js237aics2i5wzosaplc2ksgvvfdwdqlnewlyjuvj57rov7hlzi";

let schedules = []; // { name, nextDose, note, unit, interval }

app.post('/schedule', (req, res) => {
  const meds = req.body.meds || [];
  schedules = meds.filter(m => m.nextDose && m.name);
  console.log(`Updated schedules: ${schedules.length} meds`);
  res.json({ ok: true, count: schedules.length });
});

async function sendPush(title, body) {
  if (!ONESIGNAL_REST_KEY || ONESIGNAL_REST_KEY === "os_v2_app_kdrtbara3vf37jgqmku3tqkrubk6gnr5mxsubkmaova7kibxofu6js237aics2i5wzosaplc2ksgvvfdwdqlnewlyjuvj57rov7hlzi") {
    console.log("No REST key set, skipping push:", title);
    return;
  }
  try {
    const r = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],
        headings: { en: title },
        contents: { en: body },
        priority: 10
      })
    });
    const data = await r.json();
    console.log("Push sent:", data.id || data);
  } catch (e) {
    console.error("Push error:", e.message);
  }
}

// Check every 30 seconds
setInterval(async () => {
  const now = Date.now();
  for (const m of schedules) {
    if (m.nextDose && m.nextDose <= now && m.nextDose > now - 120000) {
      const key = m.name + m.nextDose;
      if (!m.sent) {
        await sendPush(`❄️ ${m.name}`, `Time for your dose${m.note ? " · " + m.note : ""}`);
        m.sent = true;
      }
    }
  }
  // Clean old ones
  schedules = schedules.filter(m => m.nextDose > now - 600000);
}, 30000);

app.get("/", (req, res) => res.send("Snowflake reminder server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
