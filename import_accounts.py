import re
from datetime import datetime

def parse_txt_file(filepath):
    """Parse the TXT file and extract account data"""
    accounts = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by separator
    blocks = content.split('--------------------------------------------------------------------------------')
    
    for block in blocks:
        if 'Código de Referência:' not in block:
            continue
        
        account = {}
        
        # Extract data using regex
        date_match = re.search(r'Data/Hora:\s*(.+)', block)
        code_match = re.search(r'Código de Referência:\s*(\w+)', block)
        email_match = re.search(r'Email:\s*(.+)', block)
        name_match = re.search(r'Nome:\s*(.+)', block)
        password_match = re.search(r'Senha:\s*(.+)', block)
        age_match = re.search(r'Idade:\s*(\d+)', block)
        gender_match = re.search(r'Gênero:\s*(\w+)', block)
        used_code_match = re.search(r'Código usado no registro:\s*(\w+)', block)
        verified_match = re.search(r'Email verificado:\s*(\w+)', block)
        
        if code_match and email_match:
            account['date'] = date_match.group(1).strip() if date_match else None
            account['referenceCode'] = code_match.group(1).strip()
            account['email'] = email_match.group(1).strip()
            account['username'] = name_match.group(1).strip() if name_match else None
            account['password'] = password_match.group(1).strip() if password_match else None
            account['age'] = int(age_match.group(1)) if age_match else None
            account['gender'] = gender_match.group(1).strip() if gender_match else None
            account['inviteCodeUsed'] = used_code_match.group(1).strip() if used_code_match else None
            account['emailVerified'] = verified_match.group(1).strip().lower() == 'sim' if verified_match else False
            
            accounts.append(account)
    
    return accounts

def generate_sql(accounts):
    """Generate SQL INSERT statements"""
    sql_statements = []
    
    for acc in accounts:
        # Escape single quotes in strings
        email = acc['email'].replace("'", "''") if acc['email'] else ''
        username = acc['username'].replace("'", "''") if acc['username'] else ''
        password = acc['password'].replace("'", "''") if acc['password'] else ''
        ref_code = acc['referenceCode'].replace("'", "''") if acc['referenceCode'] else ''
        invite_used = acc['inviteCodeUsed'].replace("'", "''") if acc['inviteCodeUsed'] else ''
        gender = acc['gender'].replace("'", "''") if acc['gender'] else ''
        age = acc['age'] if acc['age'] else 18
        verified = 1 if acc['emailVerified'] else 0
        
        sql = f"""INSERT INTO created_accounts (email, username, password, age, gender, referenceCode, inviteCodeUsed, emailVerified, codeApplied, createdAt, updatedAt) VALUES ('{email}', '{username}', '{password}', {age}, '{gender}', '{ref_code}', '{invite_used}', {verified}, 0, NOW(), NOW()) ON DUPLICATE KEY UPDATE updatedAt = NOW();"""
        sql_statements.append(sql)
    
    return sql_statements

# Parse the file
accounts = parse_txt_file('/home/ubuntu/upload/codigos_referencia.txt')
print(f"Total de contas encontradas: {len(accounts)}")

# Generate SQL
sql_statements = generate_sql(accounts)

# Save to file
with open('import_accounts.sql', 'w', encoding='utf-8') as f:
    for sql in sql_statements:
        f.write(sql + '\n')

print(f"Arquivo SQL gerado: import_accounts.sql")
print(f"\nPrimeiras 5 contas:")
for acc in accounts[:5]:
    print(f"  - {acc['referenceCode']}: {acc['email']} ({acc['username']})")

print(f"\nÚltimas 5 contas:")
for acc in accounts[-5:]:
    print(f"  - {acc['referenceCode']}: {acc['email']} ({acc['username']})")
