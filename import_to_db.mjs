import fs from 'fs';

// Parse the TXT file
function parseTxtFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const blocks = content.split('--------------------------------------------------------------------------------');
  const accounts = [];
  
  for (const block of blocks) {
    if (!block.includes('Código de Referência:')) continue;
    
    const dateMatch = block.match(/Data\/Hora:\s*(.+)/);
    const codeMatch = block.match(/Código de Referência:\s*(\w+)/);
    const emailMatch = block.match(/Email:\s*(.+)/);
    const nameMatch = block.match(/Nome:\s*(.+)/);
    const passwordMatch = block.match(/Senha:\s*(.+)/);
    const ageMatch = block.match(/Idade:\s*(\d+)/);
    const genderMatch = block.match(/Gênero:\s*(\w+)/);
    const usedCodeMatch = block.match(/Código usado no registro:\s*(\w+)/);
    const verifiedMatch = block.match(/Email verificado:\s*(\w+)/);
    
    if (codeMatch && emailMatch) {
      accounts.push({
        date: dateMatch ? dateMatch[1].trim() : null,
        referenceCode: codeMatch[1].trim(),
        email: emailMatch[1].trim(),
        username: nameMatch ? nameMatch[1].trim() : null,
        password: passwordMatch ? passwordMatch[1].trim() : null,
        age: ageMatch ? parseInt(ageMatch[1]) : 18,
        gender: genderMatch ? genderMatch[1].trim() : 'masculino',
        inviteCodeUsed: usedCodeMatch ? usedCodeMatch[1].trim() : null,
        emailVerified: verifiedMatch ? verifiedMatch[1].trim().toLowerCase() === 'sim' : false
      });
    }
  }
  
  return accounts;
}

// Generate JSON for API call
const accounts = parseTxtFile('/home/ubuntu/upload/codigos_referencia.txt');
console.log(`Total de contas: ${accounts.length}`);

// Save as JSON for import
fs.writeFileSync('accounts_to_import.json', JSON.stringify(accounts, null, 2));
console.log('Arquivo JSON salvo: accounts_to_import.json');

// Print sample
console.log('\nExemplo de conta:');
console.log(JSON.stringify(accounts[0], null, 2));
