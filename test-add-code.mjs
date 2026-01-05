import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testAddCode(email, password, inviteCode) {
  console.log(`[*] Testando adicionar código ${inviteCode} na conta ${email}...`);
  
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
    if (setCookie) {
      cookies.push(...setCookie);
    }
    return response;
  });

  session.interceptors.request.use((config) => {
    if (cookies.length > 0) {
      const cookieString = cookies.map(c => c.split(";")[0]).join("; ");
      config.headers["Cookie"] = cookieString;
    }
    return config;
  });

  try {
    // Get CSRF token
    console.log("[*] Obtendo CSRF token...");
    const csrfResponse = await session.get("/api/auth/csrf");
    const csrfToken = csrfResponse.data.csrfToken;
    console.log(`[+] CSRF Token obtido`);

    // Login
    console.log("[*] Fazendo login...");
    const loginData = new URLSearchParams({
      email,
      password,
      redirect: "false",
      csrfToken,
      callbackUrl: `${BASE_URL}/`,
      json: "true"
    });

    await session.post(
      "/api/auth/callback/credentials",
      loginData.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      }
    );

    // Check session
    const sessionResponse = await session.get("/api/auth/session");
    
    if (!sessionResponse.data || !sessionResponse.data.user) {
      console.log("[-] Falha no login");
      return false;
    }

    const userId = sessionResponse.data.user.id;
    console.log(`[+] Login OK! User ID: ${userId}`);

    // Add invite code
    console.log(`[*] Adicionando código ${inviteCode}...`);
    const addCodeData = {
      "0": {
        json: {
          code: inviteCode,
          userId: userId
        }
      }
    };

    const addCodeResponse = await session.post(
      "/api/trpc/earns.addInviteCode?batch=1",
      addCodeData
    );

    console.log(`[*] Resposta:`, JSON.stringify(addCodeResponse.data, null, 2));

    // Check result
    if (Array.isArray(addCodeResponse.data) && addCodeResponse.data.length > 0) {
      const result = addCodeResponse.data[0];
      if (result?.result?.data?.json?.success) {
        console.log(`[+] Código aplicado com sucesso! +20 estrelas`);
        return true;
      }
      if (result?.error) {
        console.log(`[-] Erro:`, result.error.json?.message || result.error);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error("[-] Erro:", error.response?.data || error.message);
    return false;
  }
}

// Test with provided credentials and a code
testAddCode("thayserodrigo12@gmail.com", "Thalyta1@", "6247C5");
