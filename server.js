const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const ONESIGNAL_APP_ID = "50e33082-20dd-4bbf-a4d0-62a9b9c151a0";
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY || "os_v2_app_kdrtbara3vf37jgqmku3tqkruajcmpoj4zvev54r7aes2krhbhem2ljd2f4ptxmwpi46nr6dwdrcgo26v437qxvxphgoblm3chzbvaa";

let schedules = [];

app.post('/schedule', (req, res) => {
  const meds = req.body.meds || [];
  schedules = meds.filter(m => m.nextDose && m.name);
  console.log(`Updated schedules: ${schedules.length} meds`, schedules.map(m => ({name: m.name, next: new Date(m.nextDose).toISOString()})));
  res.json({ ok: true, count: schedules.length });
});

async function sendPush(title, body) {
  console.log("Attempting push:", title);
  if (!ONESIGNAL_REST_KEY) {
    console.log("No REST key set, skipping push:", title);
    return;
  }
  try {
    const r = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_REST_KEY}`
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
    console.log("OneSignal response:", JSON.stringify(data));
  } catch (e) {
    console.error("Push error:", e.message);
  }
}

setInterval(async () => {
  const now = Date.now();
  console.log(`Checking ${schedules.length} schedules at ${new Date(now).toISOString()}`);
  for (const m of schedules) {
    if (m.nextDose && m.nextDose <= now && !m.sent) {
      console.log(`Dose due for ${m.name} (nextDose was ${new Date(m.nextDose).toISOString()})`);
      await sendPush(`❄️ ${m.name}`, `Time for your dose${m.note ? " · " + m.note : ""}`);
      m.sent = true;
    }
  }
  schedules = schedules.filter(m => m.nextDose > now - 600000);
}, 30000);

app.get("/", (req, res) => res.send("Snowflake reminder server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT} | Key set: ${!!ONESIGNAL_REST_KEY}`));
