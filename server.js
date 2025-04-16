const express = require("express");
const app = express();
const http = require("http").createServer(app);
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const wss = new WebSocket.Server({ server: http });
const clients = new Set();
let quizStarted = false;

const answerKey = {
  // Bộ 1 (q7 - q31)
  q7: "B", q8: "B", q9: "C", q10: "B", q11: "B",
  q12: "B", q13: "C", q14: "A", q15: "A", q16: "C",
  q17: "A", q18: "B", q19: "A", q20: "C", q21: "B",
  q22: "C", q23: "A", q24: "C", q25: "B", q26: "C",
  q27: "A", q28: "C", q29: "C", q30: "B", q31: "B",
  // Bộ 2 (q7_2 - q31_2)
  q7_2: "B", q8_2: "A", q9_2: "C", q10_2: "A", q11_2: "B",
  q12_2: "B", q13_2: "A", q14_2: "C", q15_2: "B", q16_2: "A",
  q17_2: "B", q18_2: "A", q19_2: "A", q20_2: "B", q21_2: "C",
  q22_2: "A", q23_2: "C", q24_2: "A", q25_2: "A", q26_2: "C",
  q27_2: "A", q28_2: "B", q29_2: "A", q30_2: "B", q31_2: "A",
};

app.use(express.static("public"));
app.use(bodyParser.json());

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("Client connected");
  
  // Send participant count to admin
  broadcastParticipantCount();

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "start") {
      quizStarted = true;
      broadcast({ type: "start" });
    }
    if (data.type === "end") {
      quizStarted = false;
      broadcast({ type: "end" });
    }
    if (data.type === "submitted") {
      broadcast({ type: "submitted", username: data.username });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcastParticipantCount();
  });

  ws.on("error", (error) => {
    console.error("WebSocket Error: ", error);
    clients.delete(ws);
    broadcastParticipantCount();
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastParticipantCount() {
  broadcast({ type: "participantCount", count: clients.size });
}

app.post("/submit", (req, res) => {
  const { username, answers } = req.body;
  let score = 0;
  let total = Object.keys(answerKey).length;

  for (const key in answerKey) {
    if (answers[key] && answers[key] === answerKey[key]) {
      score++;
    }
  }

  const result = { username, score, total, timestamp: new Date().toISOString() };

  let results = [];
  if (fs.existsSync("results.json")) {
    results = JSON.parse(fs.readFileSync("results.json"));
  }

  const existingUser = results.find(r => r.username === username);
  if (existingUser) {
    existingUser.score = score;
    existingUser.timestamp = result.timestamp;
  } else {
    results.push(result);
  }

  fs.writeFileSync("results.json", JSON.stringify(results, null, 2));
  res.json({ score, total });
});

app.get("/results", (req, res) => {
  if (fs.existsSync("results.json")) {
    const results = JSON.parse(fs.readFileSync("results.json"));
    res.json(results);
  } else {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});