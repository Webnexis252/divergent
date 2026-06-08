const http = require('http');

const data = JSON.stringify({
  title: "Test Course Update",
  isPublished: true,
  price: 0,
  emiPlans: []
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/courses/cmq3chxvp0008xh8ne5q5e9y',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(res.statusCode, body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
