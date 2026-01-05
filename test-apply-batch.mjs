import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function applyCode(email, password, code) {
  const cookies = [];
  
  const session = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    httpsAgent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/json",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/auth/login`
    }
  });

  session.interceptors.response.use((response) => {
    const setCookie = response.headers["set-cookie"];
    if (setCookie) cookies.push(...setCookie);
    return response;
  });

  session.interceptors.request.use((config) => {
    if (cookies.length > 0) {
      config.headers["Cookie"] = cookies.map(c => c.split(";")[0]).join("; ");
    }
    return config;
  });

  try {
    // Get CSRF token
    const csrfResponse = await session.get("/api/auth/csrf");
    const csrfToken = csrfResponse.data.csrfToken;

    // Login
    const loginData = new URLSearchParams({
      email, password, redirect: "false", csrfToken,
      callbackUrl: `${BASE_URL}/`, json: "true"
    });

    await session.post("/api/auth/callback/credentials", loginData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0, validateStatus: (status) => status < 500
    });

    // Check session
    const sessionResponse = await session.get("/api/auth/session");
    if (!sessionResponse.data?.user) {
      return { success: false, error: "Login failed" };
    }

    const userId = sessionResponse.data.user.id;

    // Add invite code
    const addCodeResponse = await session.post("/api/trpc/earns.addInviteCode?batch=1", {
      "0": { json: { code, userId } }
    });

    const result = addCodeResponse.data;
    if (Array.isArray(result) && result[0]?.result?.data?.json?.success) {
      return { success: true };
    }
    
    const errMsg = result[0]?.error?.json?.message || "Unknown error";
    const alreadyUsed = errMsg.toLowerCase().includes("já") || errMsg.toLowerCase().includes("invalid");
    return { success: false, error: errMsg, alreadyUsed };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test with 10 codes
const email = "thayserodrigo12@gmail.com";
const password = "Thalyta1@";

// Get unused codes from API
const unusedResponse = await fetch("http://localhost:3000/api/trpc/accounts.unused");
const unusedData = await unusedResponse.json();
const codes = unusedData.result.data.json.slice(0, 10).map(a => a.referenceCode);

console.log(`Testando aplicação de ${codes.length} códigos...`);

let applied = 0, failed = 0, alreadyUsed = 0;

for (const code of codes) {
  console.log(`[*] Aplicando código ${code}...`);
  const result = await applyCode(email, password, code);
  
  if (result.success) {
    console.log(`[+] ${code}: Sucesso! +20 estrelas`);
    applied++;
  } else if (result.alreadyUsed) {
    console.log(`[!] ${code}: Já usado ou inválido`);
    alreadyUsed++;
  } else {
    console.log(`[-] ${code}: Falha - ${result.error}`);
    failed++;
  }
  
  // Small delay
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n=== RESULTADO ===`);
console.log(`Aplicados: ${applied}`);
console.log(`Já usados: ${alreadyUsed}`);
console.log(`Falhas: ${failed}`);
console.log(`Estrelas ganhas: ${applied * 20}`);
