const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/api/**/route.ts');
let unprotected = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('requireAuth') && !content.includes('jwtVerify')) {
    unprotected.push(file);
  }
});

console.log('Potentially unprotected routes:');
unprotected.forEach(f => console.log(f));
