import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Criar sessão com cookies persistentes
function createSession() {
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
      "Referer": `${BASE_URL}/auth/register`
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

  return session;
}

async function checkInviteStats(email, password) {
  console.log("\n=== VERIFICANDO ESTATÍSTICAS DE CONVITE ===");
  console.log(`Email: ${email}`);
  
  const session = createSession();
  
  // Get CSRF
  const csrfResp = await session.get("/api/auth/csrf");
  const csrfToken = csrfResp.data.csrfToken;
  
  // Login
  const loginData = new URLSearchParams({
    email,
    password,
    redirect: "false",
    csrfToken,
    callbackUrl: `${BASE_URL}/`,
    json: "true"
  });
  
  await session.post("/api/auth/callback/credentials", loginData.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    maxRedirects: 0,
    validateStatus: (status) => status < 500
  });
  
  // Verificar sessão
  const sessionResp = await session.get("/api/auth/session");
  const user = sessionResp.data?.user;
  
  if (!user) {
    console.log("[-] Falha no login");
    return;
  }
  
  console.log(`[+] Logado como: ${user.name}`);
  console.log(`[+] ID: ${user.id}`);
  
  // Buscar estatísticas de convite
  try {
    const statsResp = await session.get(`/api/trpc/earns.getInviteStats?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":{"userId":user.id}}}))}`);
    console.log("\n=== ESTATÍSTICAS DE CONVITE ===");
    console.log(JSON.stringify(statsResp.data, null, 2));
  } catch (e) {
    console.log("Erro ao buscar stats:", e.response?.data || e.message);
  }
  
  // Buscar dados do usuário
  try {
    const userResp = await session.get(`/api/trpc/user.getById?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":{"id":user.id}}}))}`);
    console.log("\n=== DADOS DO USUÁRIO ===");
    const userData = userResp.data?.[0]?.result?.data?.json;
    if (userData) {
      console.log(`Nome: ${userData.name}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Código de convite: ${userData.invitationCode}`);
      console.log(`Stars: ${userData.stars || 'N/A'}`);
    }
  } catch (e) {
    console.log("Erro ao buscar user:", e.response?.data || e.message);
  }
}

// Verificar sua conta
checkInviteStats("madagascarmods347@gmail.com", "@Jujuba3473");
