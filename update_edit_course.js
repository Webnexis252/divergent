const fs = require('fs');

const file = 'src/app/admin/courses/EditCourseModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add PricingPlanBuilder import
if (!content.includes('PricingPlanBuilder')) {
  content = content.replace(
    'import CurriculumManager from "./CurriculumManager";',
    'import CurriculumManager from "./CurriculumManager";\nimport PricingPlanBuilder, { PricingPlan } from "../_components/PricingPlanBuilder";'
  );
}

// 2. Change EditForm type
content = content.replace(
  'emiPlans: EmiInstalment[];',
  'emiPlans: PricingPlan[];'
);

// 3. Update the state initialization for emiPlans
const oldStateInit = `emiPlans: Array.isArray(course.emiPlans)
      ? course.emiPlans.map((p) => ({ label: p.label, amount: String(p.amount), dueDays: String(p.dueDays) }))
      : [],`;

const newStateInit = `emiPlans: Array.isArray(course.emiPlans)
      ? course.emiPlans[0]?.installments 
        ? course.emiPlans.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.name || "Custom Instalment Plan",
            installments: p.installments.map((i: any) => ({ label: i.label || "", amount: String(i.amount || 0), dueDays: String(i.dueDays || 0) }))
          }))
        : [{
            id: "legacy",
            name: "Default Installment Plan",
            installments: course.emiPlans.map((p: any) => ({ label: p.label || "", amount: String(p.amount || 0), dueDays: String(p.dueDays || 0) }))
          }]
      : [],`;

content = content.replace(oldStateInit, newStateInit);

// 4. Remove EmiInstalment state vars and add nothing (PricingPlanBuilder handles it)
content = content.replace(
  `  // Instalment editing state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstalment, setNewInstalment] = useState<EmiInstalment>({ label: "", amount: "", dueDays: "" });
  const [editInstalment, setEditInstalment] = useState<EmiInstalment>({ label: "", amount: "", dueDays: "" });`,
  `  // Instalment editing state is now inside PricingPlanBuilder`
);

// 5. Update payload for handleSave
const oldPayload = `emiPlans: form.emiPlans.length > 0
            ? form.emiPlans.map((p) => ({
                  label: p.label,
                amount: Number(p.amount) || 0,
                dueDays: Number(p.dueDays) || 0,
              }))
                : null,`;
                
const newPayload = `emiPlans: form.emiPlans.length > 0
            ? form.emiPlans.map((plan) => ({
                id: plan.id,
                name: plan.name,
                installments: plan.installments.map(p => ({
                  label: p.label,
                  amount: Number(p.amount) || 0,
                  dueDays: Number(p.dueDays) || 0,
                }))
              }))
            : null,`;

content = content.replace(oldPayload, newPayload);

// 6. Replace the entire UI block for Instalment Plan Builder
// From `{/* Instalment Plan Builder */}` to `{/* Description & Thumbnail */}`
const startRegex = /\{\/\* Instalment Plan Builder \*\/\}/;
const endRegex = /\{\/\* Description & Thumbnail \*\/\}/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  const endIndex = endMatch.index;
  
  const blockToReplace = content.substring(startIndex, endIndex);
  
  const newBlock = `{/* Instalment Plan Builder */}
                      <PricingPlanBuilder 
                        plans={form.emiPlans} 
                        onChange={(plans) => setForm(p => ({ ...p, emiPlans: plans }))} 
                      />\n\n                      `;
                      
  content = content.replace(blockToReplace, newBlock);
}

fs.writeFileSync(file, content);
console.log("EditCourseModal updated!");
