const http = require('http');

const data = JSON.stringify({
  title: "Test Course",
  subtitle: "Test Subtitle",
  description: "Test Desc",
  price: 0,
  teacherIds: [],
  isPublished: false,
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/courses/cm2ycp2hlfgde', // A dummy course ID, wait I need a real one
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': 'auth_session=123' // Won't work because I don't have the real session token
  }
};

// I will instead write a node script that directly imports the handler or Prisma client to see the schema error.
