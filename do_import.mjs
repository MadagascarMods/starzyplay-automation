import fs from 'fs';

const accounts = JSON.parse(fs.readFileSync('accounts_to_import.json', 'utf-8'));
console.log(`Importando ${accounts.length} contas...`);

const response = await fetch('http://localhost:3000/api/trpc/accounts.importBulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    json: { accounts }
  })
});

const result = await response.json();
console.log('Resultado:', JSON.stringify(result, null, 2));
