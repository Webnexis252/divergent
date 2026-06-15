const http = require("http");

const data = JSON.stringify({
  category: "CONCEPT",
  prompt: "Test edit",
  explanation: "",
  explanationImageUrl: null,
  options: ["A", "B", "C", "D"],
  correctAnswer: ["A"],
  imageUrl: "data:image/jpeg;base64,123",
  points: 1,
  negativeMarks: 0,
  allowPartialMarking: false,
  type: "SCQ"
});

const req = http.request({
  hostname: "localhost",
  port: 3000,
  path: "/api/courses/cm.../tests/cm.../questions/cm...",
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
    "Cookie": "..." // I need auth token, this might be hard
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});

req.write(data);
req.end();
