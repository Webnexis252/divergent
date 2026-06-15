const http = require("http");

async function run() {
  const hugeString = "A".repeat(5 * 1024 * 1024); // 5MB payload
  const data = JSON.stringify({
    category: "CONCEPT",
    prompt: "Test prompt",
    explanation: "",
    explanationImageUrl: null,
    options: ["Option 1", "Option 2"],
    correctAnswer: ["Option 1"],
    imageUrl: "data:image/jpeg;base64," + hugeString,
    points: 1,
    negativeMarks: 0,
    allowPartialMarking: false,
    type: "SCQ"
  });

  const req = http.request({
    hostname: "localhost",
    port: 3000,
    path: "/api/courses/foo/tests/bar/questions/baz",
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    }
  }, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => console.log(res.statusCode, body.substring(0, 200)));
  });
  req.on("error", (e) => console.error("Req error", e));
  req.write(data);
  req.end();
}
run();
