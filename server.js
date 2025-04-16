const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Phục vụ file tĩnh từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Đáp án bài kiểm tra
const answerKey = {
    q1: 'B', q2: 'B', q3: 'C', q4: 'B', q5: 'B', q6: 'B', q7: 'C', q8: 'A', q9: 'A', q10: 'C',
    q11: 'B', q12: 'C', q13: 'A', q14: 'C', q15: 'B', q16: 'B', q17: 'B', q18: 'B', q19: 'C', q20: 'A',
    q21: 'C', q22: 'C', q23: 'B', q24: 'A', q25: 'C', q26: 'B', q27: 'A', q28: 'C', q29: 'A', q30: 'B',
    q31: 'B', q32: 'A', q33: 'C', q34: 'B', q35: 'A', q36: 'B', q37: 'A', q38: 'A', q39: 'B', q40: 'C',
    q41: 'A', q42: 'C', q43: 'A', q44: 'A', q45: 'C', q46: 'A', q47: 'B', q48: 'A', q49: 'B', q50: 'A'
};

// Xử lý WebSocket cho admin bắt đầu/kết thúc
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('WebSocket received:', data);
            if (data.type === 'start' || data.type === 'end') {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    ws.on('error', (error) => console.error('WebSocket error:', error));
});

// Endpoint nộp bài
app.post('/submit', async (req, res) => {
    try {
        const { username, answers } = req.body;
        if (!username || !answers) {
            return res.status(400).json({ error: 'Missing username or answers' });
        }

        let score = 0;
        for (let i = 1; i <= 50; i++) {
            if (answers[`q${i}`] === answerKey[`q${i}`]) {
                score++;
            }
        }

        let results = [];
        try {
            results = JSON.parse(await fs.readFile('results.json', 'utf8') || '[]');
        } catch (error) {
            console.error('Error reading results.json, initializing empty:', error);
        }

        results.push({ username, score });
        await fs.writeFile('results.json', JSON.stringify(results, null, 2));
        console.log(`Submitted: ${username}, score: ${score}`);

        res.json({ score });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint lấy kết quả
app.get('/results', async (req, res) => {
    try {
        let results = [];
        try {
            results = JSON.parse(await fs.readFile('results.json', 'utf8') || '[]');
        } catch (error) {
            console.error('Error reading results.json:', error);
        }
        res.json(results);
    } catch (error) {
        console.error('Results error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dùng port động cho Render
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});