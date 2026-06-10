const students = [{perfScore: 0}, {perfScore: 45}];
const valid = students.filter(s => s.perfScore >= 40);
console.log(valid);
