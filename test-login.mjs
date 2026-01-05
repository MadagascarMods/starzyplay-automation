import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testLogin(email, password) {
  console.log(`[*] Testando login com ${email}...`);
  
  const cookies = [];
  
  const session = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    httpsAgent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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
    console.log(`[+] CSRF Token: ${csrfToken}`);

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

    const loginResponse = await session.post(
      "/api/auth/callback/credentials",
      loginData.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 5
      }
    );
    console.log(`[*] Login response status: ${loginResponse.status}`);

    // Check session
    console.log("[*] Verificando sessão...");
    const sessionResponse = await session.get("/api/auth/session");
    console.log("[*] Session data:", JSON.stringify(sessionResponse.data, null, 2));

    if (sessionResponse.data && sessionResponse.data.user) {
      console.log("[+] Login bem-sucedido!");
      console.log(`    - Usuário: ${sessionResponse.data.user.name}`);
      console.log(`    - Email: ${sessionResponse.data.user.email}`);
      console.log(`    - ID: ${sessionResponse.data.user.id}`);
      return true;
    } else {
      console.log("[-] Falha no login - sessão não encontrada");
      return false;
    }
  } catch (error) {
    console.error("[-] Erro:", error.response?.data || error.message);
    return false;
  }
}

// Test with provided credentials
testLogin("thayserodrigo12@gmail.com", "Thalyta1@");
