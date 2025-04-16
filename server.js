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
  // Add your answer key here
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