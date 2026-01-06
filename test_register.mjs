import axios from "axios";
import https from "https";

const BASE_URL = "https://starzyplay.com";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testRegister() {
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

  // Get CSRF token
  const csrfResp = await session.get("/api/auth/csrf");
  console.log("CSRF Token:", csrfResp.data.csrfToken);

  // Register data - IMPORTANTE: verificar formato do inviteCode
  const registerData = {
    "0": {
      json: {
        name: "testuser" + Math.floor(Math.random() * 10000),
        email: "test" + Date.now() + "@test.com",
        password: "Test1234!",
        age: 25,
        gender: "masculino",
        inviteCode: "6247C5"  // Seu código
      }
    }
  };

  console.log("\n=== DADOS ENVIADOS ===");
  console.log(JSON.stringify(registerData, null, 2));

  try {
    const response = await session.post("/api/trpc/user.register?batch=1", registerData);
    console.log("\n=== RESPOSTA ===");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("\n=== ERRO ===");
    console.log("Status:", error.response?.status);
    console.log("Data:", JSON.stringify(error.response?.data, null, 2));
  }
}

testRegister();
