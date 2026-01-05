import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testApplyCode(email, password, code) {
  console.log(`\n[*] Testando aplicar código ${code} na conta ${email}...`);
  
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
    const csrfResponse = await session.get("/api/auth/csrf");
    const csrfToken = csrfResponse.data.csrfToken;

    // Login
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
      return { success: false, error: "Login failed" };
    }

    const userId = sessionResponse.data.user.id;
    console.log(`[+] Login OK! User ID: ${userId}`);

    // Add invite code
    console.log(`[*] Adicionando código ${code}...`);
    const addCodeData = {
      "0": {
        json: {
          code: code,
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
        return { success: true };
      }
      if (result?.error) {
        const errMsg = result.error.json?.message || JSON.stringify(result.error);
        console.log(`[-] Erro:`, errMsg);
        return { success: false, error: errMsg, alreadyUsed: errMsg.toLowerCase().includes("já") || errMsg.toLowerCase().includes("invalid") };
      }
    }

    return { success: false, error: "Unknown error" };
  } catch (error) {
    console.error("[-] Erro:", error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Test with the codes from the screenshot
const codes = ["7E5107", "94E28A", "CCE8C6", "9D5DAF"];
const email = "thayserodrigo12@gmail.com";
const password = "Thalyta1@";

for (const code of codes) {
  await testApplyCode(email, password, code);
}
