const fs = require('fs');

const file = 'src/app/admin/bundles/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PricingPlanBuilder')) {
  // Try to find imports
  content = content.replace(
    'import { useState, useRef, useEffect } from "react";',
    'import { useState, useRef, useEffect } from "react";\nimport PricingPlanBuilder, { PricingPlan } from "../_components/PricingPlanBuilder";'
  );
}

// 2. Change state
const oldState = `const [emiPlans, setEmiPlans] = useState<Array<{ label: string; amount: string; dueDays: string }>>([]);`;
const newState = `const [emiPlans, setEmiPlans] = useState<PricingPlan[]>([]);`;
content = content.replace(oldState, newState);

// 3. Update loading
const oldLoading = `setEmiPlans(Array.isArray(bundle.emiPlans) ? bundle.emiPlans.map((p) => ({ label: p.label, amount: String(p.amount), dueDays: String(p.dueDays) })) : []);`;
const newLoading = `setEmiPlans(Array.isArray(bundle.emiPlans)
      ? bundle.emiPlans[0]?.installments 
        ? bundle.emiPlans.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            name: p.name || "Custom Instalment Plan",
            installments: p.installments.map((i: any) => ({ label: i.label || "", amount: String(i.amount || 0), dueDays: String(i.dueDays || 0) }))
          }))
        : [{
            id: "legacy",
            name: "Default Installment Plan",
            installments: bundle.emiPlans.map((p: any) => ({ label: p.label || "", amount: String(p.amount || 0), dueDays: String(p.dueDays || 0) }))
          }]
      : []);`;
content = content.replace(oldLoading, newLoading);

// 4. Update save payload
const oldPayload = `emiPlans: emiPlans.length > 0 ? emiPlans.map((p) => ({ label: p.label, amount: Number(p.amount) || 0, dueDays: Number(p.dueDays) || 0 })) : null,`;
const newPayload = `emiPlans: emiPlans.length > 0
            ? emiPlans.map((plan) => ({
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

// 5. Replace UI block
const startRegex = /\{\/\* Installment Breakdown \*\/\}/;
const endRegex = /\{\/\* Included Courses \*\/\}/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
  const startIndex = startMatch.index;
  const endIndex = endMatch.index;
  
  const blockToReplace = content.substring(startIndex, endIndex);
  const newBlock = `{/* Installment Breakdown */}
                      <PricingPlanBuilder 
                        plans={emiPlans} 
                        onChange={setEmiPlans} 
                      />\n\n                      `;
  content = content.replace(blockToReplace, newBlock);
}

fs.writeFileSync(file, content);
console.log("Bundle Page updated!");
