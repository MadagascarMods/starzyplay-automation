import axios from "axios";

const REQUEST_TIMEOUT = 30000;

// ==========================================
// 1SECMAIL CLIENT (mais confiável)
// ==========================================

interface SecMailAccount {
  email: string;
  login: string;
  domain: string;
}

export async function create1SecMailAccount(): Promise<SecMailAccount | null> {
  try {
    // Get random email
    const response = await axios.get(
      "https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1",
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    const email = response.data[0];
    if (!email) {
      console.log("[-] Failed to create 1secmail account");
      return null;
    }

    const [login, domain] = email.split("@");
    console.log(`[+] 1SecMail account created: ${email}`);
    return { email, login, domain };
  } catch (error: any) {
    console.error("[-] Error creating 1secmail account:", error.message);
    return null;
  }
}

export async function get1SecMailMessages(login: string, domain: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    return response.data || [];
  } catch (error: any) {
    console.error("[-] Error getting 1secmail messages:", error.message);
    return [];
  }
}

export async function get1SecMailMessage(login: string, domain: string, id: number): Promise<any | null> {
  try {
    const response = await axios.get(
      `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[-] Error getting 1secmail message:", error.message);
    return null;
  }
}

// ==========================================
// TEMPMAIL.LOL CLIENT
// ==========================================

interface TempMailLolAccount {
  email: string;
  token: string;
}

export async function createTempMailLolAccount(): Promise<TempMailLolAccount | null> {
  try {
    const response = await axios.get(
      "https://api.tempmail.lol/generate",
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    const email = response.data.address;
    const token = response.data.token;

    if (!email || !token) {
      console.log("[-] Failed to create tempmail.lol account");
      return null;
    }

    console.log(`[+] TempMail.lol account created: ${email}`);
    return { email, token };
  } catch (error: any) {
    console.error("[-] Error creating tempmail.lol account:", error.message);
    return null;
  }
}

export async function getTempMailLolMessages(token: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://api.tempmail.lol/auth/${token}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    return response.data.email || [];
  } catch (error: any) {
    console.error("[-] Error getting tempmail.lol messages:", error.message);
    return [];
  }
}

// ==========================================
// MAIL.TM CLIENT
// ==========================================

interface MailTmAccount {
  email: string;
  password: string;
  token: string;
  accountId: string;
}

export async function createMailTmAccount(): Promise<MailTmAccount | null> {
  try {
    // Get available domains
    const domainsResponse = await axios.get("https://api.mail.tm/domains", {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });

    let domains = domainsResponse.data;
    if (!Array.isArray(domains)) {
      domains = domains["hydra:member"] || [];
    }

    if (domains.length === 0) {
      console.log("[-] No domains available from mail.tm");
      return null;
    }

    const domain = domains[0].domain;
    const username = generateRandomString(10);
    const email = `${username}@${domain}`;
    const password = generateRandomString(12);

    // Create account
    const createResponse = await axios.post(
      "https://api.mail.tm/accounts",
      { address: email, password },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    if (createResponse.status !== 201) {
      console.log("[-] Failed to create mail.tm account");
      return null;
    }

    const accountId = createResponse.data.id;

    // Login to get token
    const tokenResponse = await axios.post(
      "https://api.mail.tm/token",
      { address: email, password },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    const token = tokenResponse.data.token;

    console.log(`[+] Mail.tm account created: ${email}`);
    return { email, password, token, accountId };
  } catch (error: any) {
    console.error("[-] Error creating mail.tm account:", error.message);
    return null;
  }
}

export async function getMailTmMessages(token: string): Promise<any[]> {
  try {
    const response = await axios.get("https://api.mail.tm/messages", {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    let messages = response.data;
    if (!Array.isArray(messages)) {
      messages = messages["hydra:member"] || [];
    }

    return messages;
  } catch (error: any) {
    console.error("[-] Error getting mail.tm messages:", error.message);
    return [];
  }
}

export async function getMailTmMessage(token: string, messageId: string): Promise<any | null> {
  try {
    const response = await axios.get(`https://api.mail.tm/messages/${messageId}`, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error("[-] Error getting mail.tm message:", error.message);
    return null;
  }
}

// ==========================================
// GUERRILLAMAIL CLIENT
// ==========================================

interface GuerrillaMailAccount {
  email: string;
  sidToken: string;
}

export async function createGuerrillaMailAccount(): Promise<GuerrillaMailAccount | null> {
  try {
    const response = await axios.get(
      "https://api.guerrillamail.com/ajax.php?f=get_email_address",
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    const email = response.data.email_addr;
    const sidToken = response.data.sid_token;

    if (!email || !sidToken) {
      console.log("[-] Failed to create guerrillamail account");
      return null;
    }

    console.log(`[+] GuerrillaMail account created: ${email}`);
    return { email, sidToken };
  } catch (error: any) {
    console.error("[-] Error creating guerrillamail account:", error.message);
    return null;
  }
}

export async function getGuerrillaMailMessages(sidToken: string): Promise<any[]> {
  try {
    const response = await axios.get(
      `https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${sidToken}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    return response.data.list || [];
  } catch (error: any) {
    console.error("[-] Error getting guerrillamail messages:", error.message);
    return [];
  }
}

export async function getGuerrillaMailMessage(sidToken: string, mailId: string): Promise<any | null> {
  try {
    const response = await axios.get(
      `https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${mailId}&sid_token=${sidToken}`,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("[-] Error getting guerrillamail message:", error.message);
    return null;
  }
}

// ==========================================
// UNIFIED TEMP MAIL CLIENT
// ==========================================

export interface TempMailAccount {
  email: string;
  provider: "1secmail" | "tempmail.lol" | "mail.tm" | "guerrillamail";
  token?: string;
  sidToken?: string;
  password?: string;
  login?: string;
  domain?: string;
}

export async function createTempMailAccount(): Promise<TempMailAccount | null> {
  // Try 1SecMail first (most reliable)
  console.log("[*] Trying 1secmail.com...");
  const secMail = await create1SecMailAccount();
  if (secMail) {
    return {
      email: secMail.email,
      provider: "1secmail",
      login: secMail.login,
      domain: secMail.domain
    };
  }

  // Try tempmail.lol
  console.log("[*] Trying tempmail.lol...");
  const tempMailLol = await createTempMailLolAccount();
  if (tempMailLol) {
    return {
      email: tempMailLol.email,
      provider: "tempmail.lol",
      token: tempMailLol.token
    };
  }

  // Try mail.tm
  console.log("[*] Trying mail.tm...");
  const mailTm = await createMailTmAccount();
  if (mailTm) {
    return {
      email: mailTm.email,
      provider: "mail.tm",
      token: mailTm.token,
      password: mailTm.password
    };
  }

  // Fallback to GuerrillaMail
  console.log("[*] Trying guerrillamail...");
  const guerrilla = await createGuerrillaMailAccount();
  if (guerrilla) {
    return {
      email: guerrilla.email,
      provider: "guerrillamail",
      sidToken: guerrilla.sidToken
    };
  }

  console.log("[-] All email APIs failed");
  return null;
}

export async function waitForEmail(
  account: TempMailAccount,
  subjectContains?: string,
  timeout = 120,
  checkInterval = 5
): Promise<any | null> {
  console.log(`[*] Waiting for email (timeout: ${timeout}s)...`);
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < timeout) {
    let messages: any[] = [];

    if (account.provider === "1secmail" && account.login && account.domain) {
      messages = await get1SecMailMessages(account.login, account.domain);
    } else if (account.provider === "tempmail.lol" && account.token) {
      messages = await getTempMailLolMessages(account.token);
    } else if (account.provider === "mail.tm" && account.token) {
      messages = await getMailTmMessages(account.token);
    } else if (account.provider === "guerrillamail" && account.sidToken) {
      messages = await getGuerrillaMailMessages(account.sidToken);
    }

    for (const msg of messages) {
      let subject = "";
      
      if (account.provider === "1secmail") {
        subject = msg.subject || "";
      } else if (account.provider === "tempmail.lol") {
        subject = msg.subject || "";
      } else if (account.provider === "mail.tm") {
        subject = msg.subject || "";
      } else {
        subject = msg.mail_subject || "";
      }

      if (subjectContains) {
        if (subject.toLowerCase().includes(subjectContains.toLowerCase())) {
          console.log(`[+] Email found: ${subject}`);
          
          if (account.provider === "1secmail" && account.login && account.domain) {
            return await get1SecMailMessage(account.login, account.domain, msg.id);
          } else if (account.provider === "tempmail.lol") {
            return msg;
          } else if (account.provider === "mail.tm" && account.token) {
            return await getMailTmMessage(account.token, msg.id);
          } else if (account.provider === "guerrillamail" && account.sidToken) {
            return await getGuerrillaMailMessage(account.sidToken, msg.mail_id);
          }
        }
      } else if (subject) {
        console.log(`[+] Email found: ${subject}`);
        
        if (account.provider === "1secmail" && account.login && account.domain) {
          return await get1SecMailMessage(account.login, account.domain, msg.id);
        } else if (account.provider === "tempmail.lol") {
          return msg;
        } else if (account.provider === "mail.tm" && account.token) {
          return await getMailTmMessage(account.token, msg.id);
        } else if (account.provider === "guerrillamail" && account.sidToken) {
          return await getGuerrillaMailMessage(account.sidToken, msg.mail_id);
        }
      }
    }

    console.log(`[*] No email found, waiting ${checkInterval}s...`);
    await sleep(checkInterval * 1000);
  }

  console.log("[-] Timeout: No email received");
  return null;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function extractVerificationCode(emailData: any, provider: string): string | null {
  let emailBody = "";
  
  if (provider === "1secmail") {
    emailBody = emailData?.body || emailData?.textBody || emailData?.htmlBody || "";
  } else if (provider === "tempmail.lol") {
    emailBody = emailData?.body || emailData?.html || "";
  } else if (provider === "mail.tm") {
    emailBody = emailData?.text || emailData?.html || "";
  } else {
    emailBody = emailData?.mail_body || "";
  }

  const patterns = [
    /código[:\s]*(\d{6})/i,
    /code[:\s]*(\d{6})/i,
    /verificação[:\s]*(\d{6})/i,
    /verification[:\s]*(\d{6})/i,
    /(\d{6})/
  ];

  for (const pattern of patterns) {
    const match = String(emailBody).match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
