import axios, { AxiosInstance } from "axios";
import * as https from "https";

const BASE_URL = "https://starzyplay.com";
const REQUEST_TIMEOUT = 30000;

// Criar agente HTTPS que ignora verificação SSL (como no Python)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// ==========================================
// STARZYPLAY CLIENT
// ==========================================

export class StarzyPlayClient {
  private session: AxiosInstance;
  private csrfToken: string | null = null;
  private cookies: string[] = [];
  public userData: any = null;
  public loggedIn: boolean = false;
  public userId: string | null = null;

  constructor() {
    this.session = axios.create({
      baseURL: BASE_URL,
      timeout: REQUEST_TIMEOUT,
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

    // Interceptor para capturar cookies
    this.session.interceptors.response.use((response) => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        this.cookies.push(...setCookie);
      }
      return response;
    });

    // Interceptor para enviar cookies
    this.session.interceptors.request.use((config) => {
      if (this.cookies.length > 0) {
        const cookieString = this.cookies
          .map(c => c.split(";")[0])
          .join("; ");
        config.headers["Cookie"] = cookieString;
      }
      return config;
    });
  }

  async getCsrfToken(): Promise<string | null> {
    try {
      const response = await this.session.get("/api/auth/csrf");
      this.csrfToken = response.data.csrfToken;
      console.log("[+] CSRF Token obtido");
      return this.csrfToken;
    } catch (error: any) {
      console.error("[-] Erro ao obter CSRF token:", error.message);
      return null;
    }
  }

  static generateRandomName(): string {
    const prefixes = ["user", "player", "gamer", "star", "cool", "pro", "mega", "super", "ultra", "max"];
    const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return prefixes[Math.floor(Math.random() * prefixes.length)] + suffix;
  }

  static generateRandomPassword(): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const special = "!@#$%&*";

    let password = 
      uppercase.charAt(Math.floor(Math.random() * uppercase.length)) +
      lowercase.charAt(Math.floor(Math.random() * lowercase.length)) +
      digits.charAt(Math.floor(Math.random() * digits.length)) +
      special.charAt(Math.floor(Math.random() * special.length));

    const allChars = uppercase + lowercase + digits;
    for (let i = 0; i < 4; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle password
    return password.split("").sort(() => Math.random() - 0.5).join("");
  }

  async register(
    name: string,
    email: string,
    password: string,
    age: number,
    gender: string,
    inviteCode?: string
  ): Promise<any> {
    await this.getCsrfToken();

    const registerData = {
      "0": {
        json: {
          name,
          email,
          password,
          age,
          gender,
          inviteCode
        }
      }
    };

    try {
      // Atualizar referer para registro
      this.session.defaults.headers["Referer"] = `${BASE_URL}/auth/register`;
      
      const response = await this.session.post(
        "/api/trpc/user.register?batch=1",
        registerData
      );

      console.log(`[*] Status do registro: ${response.status}`);

      if (response.status === 200) {
        const result = response.data;
        if (Array.isArray(result) && result.length > 0) {
          const data = result[0]?.result?.data?.json;
          if (data) {
            this.userData = data;
            console.log("[+] Conta registrada com sucesso!");
            console.log(`    - ID: ${data.id}`);
            console.log(`    - Nome: ${data.name}`);
            console.log(`    - Email: ${data.email}`);
            console.log(`    - Código de convite: ${data.invitationCode}`);
            return data;
          }
        }
      }

      console.log(`[-] Resposta do registro: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Erro ao registrar:", error.response?.data || error.message);
      return null;
    }
  }

  async sendVerificationCode(email: string): Promise<any> {
    const data = {
      "0": {
        json: { email }
      }
    };

    try {
      const response = await this.session.post(
        "/api/trpc/user.sendVerificationCode?batch=1",
        data
      );
      console.log(`[*] Código de verificação solicitado: ${response.status}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Erro ao solicitar código:", error.response?.data || error.message);
      return null;
    }
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const data = {
      "0": {
        json: { email, code }
      }
    };

    try {
      const response = await this.session.post(
        "/api/trpc/user.verifyCode?batch=1",
        data
      );

      console.log(`[*] Verificação de código: ${response.status}`);

      const result = response.data;
      if (Array.isArray(result) && result.length > 0) {
        const success = result[0]?.result?.data?.json?.success;
        if (success) {
          console.log("[+] Email verificado com sucesso!");
          return true;
        }
      }

      console.log(`[-] Resposta da verificação: ${JSON.stringify(result)}`);
      return false;
    } catch (error: any) {
      console.error("[-] Erro ao verificar código:", error.response?.data || error.message);
      return false;
    }
  }

  async login(email: string, password: string): Promise<any> {
    await this.getCsrfToken();

    // Login usa application/x-www-form-urlencoded
    const loginData = new URLSearchParams({
      email,
      password,
      redirect: "false",
      csrfToken: this.csrfToken || "",
      callbackUrl: `${BASE_URL}/`,
      json: "true"
    });

    try {
      await this.session.post(
        "/api/auth/callback/credentials",
        loginData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        }
      );

      // Verificar sessão
      const sessionResponse = await this.session.get("/api/auth/session");
      const sessionData = sessionResponse.data;

      if (sessionData && sessionData.user) {
        this.loggedIn = true;
        this.userId = sessionData.user.id;
        console.log("[+] Login bem-sucedido!");
        console.log(`    - Usuário: ${sessionData.user.name}`);
        console.log(`    - Email: ${sessionData.user.email}`);
        console.log(`    - ID: ${sessionData.user.id}`);
        return sessionData;
      }

      console.log("[-] Falha no login - sessão não encontrada");
      return null;
    } catch (error: any) {
      console.error("[-] Erro no login:", error.response?.data || error.message);
      return null;
    }
  }

  async addInviteCode(code: string): Promise<any> {
    if (!this.loggedIn || !this.userId) {
      console.log("[-] É necessário estar logado para adicionar código de convite");
      return null;
    }

    const data = {
      "0": {
        json: {
          code,
          userId: this.userId
        }
      }
    };

    try {
      const response = await this.session.post(
        "/api/trpc/earns.addInviteCode?batch=1",
        data
      );

      console.log(`[*] Adição de código de convite: ${response.status}`);
      console.log(`[*] Resposta: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Erro ao adicionar código:", error.response?.data || error.message);
      return null;
    }
  }
}

// ==========================================
// AUTOMATION FUNCTIONS
// ==========================================

export interface AccountCreationResult {
  success: boolean;
  email?: string;
  username?: string;
  password?: string;
  age?: number;
  gender?: string;
  inviteCodeUsed?: string;
  newInviteCode?: string;
  verificationCode?: string;
  emailVerified?: boolean;
  loginSuccess?: boolean;
  error?: string;
}

export async function createNewAccount(
  inviteCode: string,
  tempMailAccount: { email: string; provider: string; token?: string; sidToken?: string },
  waitForEmailFn: (account: any, subject?: string, timeout?: number) => Promise<any>,
  extractCodeFn: (emailData: any, provider: string) => string | null
): Promise<AccountCreationResult> {
  const starzy = new StarzyPlayClient();

  // Generate random data
  const username = StarzyPlayClient.generateRandomName();
  const password = StarzyPlayClient.generateRandomPassword();
  const age = Math.floor(Math.random() * 28) + 18; // 18-45
  const gender = Math.random() > 0.5 ? "masculino" : "feminino";

  console.log(`[*] Registrando conta...`);
  console.log(`    - Nome: ${username}`);
  console.log(`    - Email: ${tempMailAccount.email}`);
  console.log(`    - Senha: ${password}`);
  console.log(`    - Idade: ${age}`);
  console.log(`    - Gênero: ${gender}`);

  // Register account
  const registerResult = await starzy.register(
    username,
    tempMailAccount.email,
    password,
    age,
    gender,
    inviteCode
  );

  if (!registerResult) {
    return {
      success: false,
      error: "Falha ao registrar conta"
    };
  }

  // Check if registration returned an error
  if (Array.isArray(registerResult) && registerResult[0]?.error) {
    const errorMsg = registerResult[0].error?.json?.message || "Erro desconhecido no registro";
    return {
      success: false,
      error: errorMsg
    };
  }

  // Send verification code
  console.log("[*] Solicitando código de verificação...");
  await starzy.sendVerificationCode(tempMailAccount.email);

  // Wait for email
  console.log("[*] Aguardando email de verificação...");
  const emailData = await waitForEmailFn(tempMailAccount, "verif", 120);

  let verificationCode: string | null = null;
  let emailVerified = false;

  if (emailData) {
    verificationCode = extractCodeFn(emailData, tempMailAccount.provider);

    if (verificationCode) {
      console.log(`[+] Código de verificação extraído: ${verificationCode}`);
      emailVerified = await starzy.verifyCode(tempMailAccount.email, verificationCode);
    } else {
      console.log("[-] Não foi possível extrair o código de verificação");
    }
  } else {
    console.log("[-] Nenhum email de verificação recebido");
  }

  // Login
  console.log("[*] Fazendo login...");
  const loginResult = await starzy.login(tempMailAccount.email, password);

  // Get invite code
  let newInviteCode: string | null = null;
  if (starzy.userData) {
    newInviteCode = starzy.userData.invitationCode;
  }

  return {
    success: true,
    email: tempMailAccount.email,
    username,
    password,
    age,
    gender,
    inviteCodeUsed: inviteCode,
    newInviteCode: newInviteCode || undefined,
    verificationCode: verificationCode || undefined,
    emailVerified,
    loginSuccess: loginResult !== null
  };
}

export async function applyInviteCode(
  code: string,
  refEmail: string,
  refPassword: string
): Promise<{ success: boolean; error?: string; alreadyUsed?: boolean }> {
  console.log(`[*] Aplicando código ${code} na conta ${refEmail}...`);

  const client = new StarzyPlayClient();

  // Login
  const loginResult = await client.login(refEmail, refPassword);
  if (!loginResult) {
    return {
      success: false,
      error: "Falha no login da conta de referência"
    };
  }

  // Add invite code
  const result = await client.addInviteCode(code);

  if (result) {
    if (Array.isArray(result) && result.length > 0) {
      const responseData = result[0];

      // Check success
      if (responseData?.result?.data?.json?.success) {
        console.log(`[+] Código ${code} aplicado com sucesso! +20 estrelas`);
        return { success: true };
      }

      // Check if already used
      const error = responseData?.error || {};
      const errorMsg = JSON.stringify(error).toLowerCase();
      if (errorMsg.includes("já") || errorMsg.includes("already") || errorMsg.includes("usado") || errorMsg.includes("used") || errorMsg.includes("invalid")) {
        console.log(`[!] Código ${code} já foi usado ou é inválido`);
        return { success: false, alreadyUsed: true };
      }
    }
  }

  console.log(`[-] Falha ao aplicar código ${code}`);
  return { success: false, error: "Falha ao aplicar código" };
}

// ==========================================
// TEST FUNCTION
// ==========================================

export async function testLogin(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  console.log(`[*] Testando login com ${email}...`);
  
  const client = new StarzyPlayClient();
  const result = await client.login(email, password);
  
  if (result && result.user) {
    return {
      success: true,
      user: result.user
    };
  }
  
  return {
    success: false,
    error: "Falha no login"
  };
}
