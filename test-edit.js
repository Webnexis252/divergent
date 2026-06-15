const http = require("http");

async function run() {
  const data = JSON.stringify({
    category: "CONCEPT",
    prompt: "Test prompt",
    explanation: "",
    explanationImageUrl: null,
    options: ["Option 1", "Option 2"],
    correctAnswer: ["Option 1"],
    imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    points: 1,
    negativeMarks: 0,
    allowPartialMarking: false,
    type: "SCQ"
  });

  const req = http.request({
    hostname: "localhost",
    port: 3000,
    path: "/api/courses", // Let's just test if we can hit any authenticated route
    method: "GET",
  }, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => console.log(res.statusCode, body.substring(0, 200)));
  });
  req.end();
}
run();
