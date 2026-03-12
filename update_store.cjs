const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'stores', 'contactStore.ts');
if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Update Interaction interface
content = content.replace(
    /export interface Interaction \{([\s\S]*?)\}/,
    `export interface Interaction {
    id: string;
    contactId: number;
    type: InteractionType;
    title: string;
    description: string;
    date: string;
    heure: string;
    agent: string;
    lieu?: string; // For RDV and visits
    issue?: string; // Follow-up action description
    executionStatus: 'fait' | 'a_faire';
}`
);

// Update initialInteractions
content = content.replace(
    /const initialInteractions: Interaction\[\] = \[([\s\S]*?)\];/,
    `const initialInteractions: Interaction[] = [
    { id: 'int1', contactId: 1, type: 'call', title: 'Appel de qualification', date: '2026-03-05', heure: '14:30', agent: 'Abdou Sarr', description: 'Discussion sur le budget et les préférences de zone.', executionStatus: 'fait' },
    { id: 'int2', contactId: 1, type: 'email', title: 'Envoi catalogue', date: '2026-03-04', heure: '09:15', agent: 'Abdou Sarr', description: 'Brochure PDF des terrains disponibles envoyée par email.', executionStatus: 'fait' },
    { id: 'int3', contactId: 2, type: 'visite_terrain', title: 'Visite terrain - Almadies Phase 2', date: '2026-03-06', heure: '15:30', agent: 'Abdou Sarr', description: "Visite de la parcelle Lot 22. Cliente très intéressée.", issue: 'Envoi proposition de prix prévue le 10 Mar.', executionStatus: 'fait' },
];`
);

// Update addInteraction
content = content.replace(
    /const newInteraction = \{ \.\.\.i, id: intId \};/,
    `const newInteraction = { ...i, id: intId, executionStatus: i.executionStatus || 'fait' };`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete');
