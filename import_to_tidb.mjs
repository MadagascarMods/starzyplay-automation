import fs from 'fs';

// Ler o arquivo TXT
const content = fs.readFileSync('/home/ubuntu/upload/pasted_content_5.txt', 'utf-8');

// Parsear as contas
const accounts = [];
const blocks = content.split('--------------------------------------------------------------------------------');

for (const block of blocks) {
  const lines = block.trim().split('\n').filter(l => l.trim());
  if (lines.length < 5) continue;
  
  const account = {};
  for (const line of lines) {
    if (line.startsWith('Data/Hora:')) account.createdAt = line.replace('Data/Hora:', '').trim();
    if (line.startsWith('Código de Referência:')) account.referenceCode = line.replace('Código de Referência:', '').trim();
    if (line.startsWith('Email:')) account.email = line.replace('Email:', '').trim();
    if (line.startsWith('Nome:')) account.username = line.replace('Nome:', '').trim();
    if (line.startsWith('Senha:')) account.password = line.replace('Senha:', '').trim();
    if (line.startsWith('Idade:')) account.age = parseInt(line.replace('Idade:', '').trim()) || 25;
    if (line.startsWith('Gênero:')) account.gender = line.replace('Gênero:', '').trim();
    if (line.startsWith('Código usado no registro:')) account.inviteCodeUsed = line.replace('Código usado no registro:', '').trim();
    if (line.startsWith('Email verificado:')) account.emailVerified = line.includes('Sim') ? 1 : 0;
  }
  
  if (account.referenceCode && account.email) {
    accounts.push(account);
  }
}

console.log(`Total de contas encontradas: ${accounts.length}`);

// Gerar SQL para inserção
let sql = 'INSERT INTO created_accounts (referenceCode, email, username, password, age, gender, inviteCodeUsed, emailVerified, loginSuccess, codeApplied, createdAt) VALUES\n';
const values = accounts.map(a => {
  const dt = a.createdAt ? `'${a.createdAt.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1')}'` : 'NOW()';
  return `('${a.referenceCode}', '${a.email}', '${a.username || ''}', '${a.password?.replace(/'/g, "''") || ''}', ${a.age || 25}, '${a.gender || 'masculino'}', '${a.inviteCodeUsed || '6247C5'}', ${a.emailVerified || 0}, 1, 0, NOW())`;
});
sql += values.join(',\n') + ';';

fs.writeFileSync('/home/ubuntu/starzyplay-automation/import_tidb.sql', sql);
console.log('SQL gerado em import_tidb.sql');
console.log('Primeiras 5 contas:', accounts.slice(0, 5).map(a => a.referenceCode));
