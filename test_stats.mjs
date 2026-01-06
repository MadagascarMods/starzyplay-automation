import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function test() {
  const cookies = [];
  const session = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    httpsAgent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
      "Content-Type": "application/json",
      "Origin": BASE_URL,
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

  // Login
  const csrfResp = await session.get("/api/auth/csrf");
  const csrfToken = csrfResp.data.csrfToken;
  
  await session.post("/api/auth/callback/credentials", 
    new URLSearchParams({
      email: "madagascarmods347@gmail.com",
      password: "@Jujuba3473",
      redirect: "false",
      csrfToken,
      callbackUrl: `${BASE_URL}/`,
      json: "true"
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    }
  );
  
  const sessionResp = await session.get("/api/auth/session");
  console.log("Sessão:", JSON.stringify(sessionResp.data, null, 2));
  
  const userId = sessionResp.data?.user?.id;
  if (!userId) {
    console.log("Falha no login");
    return;
  }
  
  // Buscar estatísticas de convite usando a API correta
  console.log("\n=== Buscando estatísticas ===");
  
  // Tentar diferentes endpoints
  const endpoints = [
    `/api/trpc/earns.getInviteStats?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":null}}))}`,
    `/api/trpc/user.getInviteCount?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":null}}))}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      const resp = await session.get(endpoint);
      console.log(`\nEndpoint: ${endpoint.split('?')[0]}`);
      console.log("Resposta:", JSON.stringify(resp.data, null, 2));
    } catch (e) {
      console.log(`Erro em ${endpoint.split('?')[0]}:`, e.response?.status);
    }
  }
}

test().catch(console.error);
