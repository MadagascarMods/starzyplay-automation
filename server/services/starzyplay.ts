import axios, { AxiosInstance } from "axios";

const BASE_URL = "https://starzyplay.com";
const REQUEST_TIMEOUT = 30000;

// ==========================================
// STARZYPLAY CLIENT
// ==========================================

export class StarzyPlayClient {
  private session: AxiosInstance;
  private csrfToken: string | null = null;
  public userData: any = null;
  public loggedIn: boolean = false;

  constructor() {
    this.session = axios.create({
      baseURL: BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        "Origin": BASE_URL,
        "Referer": `${BASE_URL}/auth/register`
      },
      withCredentials: true
    });
  }

  async getCsrfToken(): Promise<string | null> {
    try {
      const response = await this.session.get("/api/auth/csrf");
      this.csrfToken = response.data.csrfToken;
      console.log("[+] CSRF Token obtained");
      return this.csrfToken;
    } catch (error) {
      console.error("[-] Error getting CSRF token:", error);
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
      const response = await this.session.post(
        "/api/trpc/user.register?batch=1",
        registerData
      );

      console.log(`[*] Registration status: ${response.status}`);

      if (response.status === 200) {
        const result = response.data;
        if (Array.isArray(result) && result.length > 0) {
          const data = result[0]?.result?.data?.json;
          if (data) {
            this.userData = data;
            console.log("[+] Account registered successfully!");
            console.log(`    - ID: ${data.id}`);
            console.log(`    - Name: ${data.name}`);
            console.log(`    - Email: ${data.email}`);
            console.log(`    - Invite code: ${data.invitationCode}`);
            return data;
          }
        }
      }

      console.log(`[-] Registration response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Error registering:", error.response?.data || error.message);
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
      console.log(`[*] Verification code requested: ${response.status}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Error requesting code:", error.response?.data || error.message);
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

      console.log(`[*] Code verification: ${response.status}`);

      const result = response.data;
      if (Array.isArray(result) && result.length > 0) {
        const success = result[0]?.result?.data?.json?.success;
        if (success) {
          console.log("[+] Email verified successfully!");
          return true;
        }
      }

      console.log(`[-] Verification response: ${JSON.stringify(result)}`);
      return false;
    } catch (error: any) {
      console.error("[-] Error verifying code:", error.response?.data || error.message);
      return false;
    }
  }

  async login(email: string, password: string): Promise<any> {
    await this.getCsrfToken();

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
          }
        }
      );

      // Check session
      const sessionResponse = await this.session.get("/api/auth/session");
      const sessionData = sessionResponse.data;

      if (sessionData && sessionData.user) {
        this.loggedIn = true;
        console.log("[+] Login successful!");
        console.log(`    - User: ${sessionData.user.name}`);
        console.log(`    - Email: ${sessionData.user.email}`);
        return sessionData;
      }

      console.log("[-] Login failed - session not found");
      return null;
    } catch (error: any) {
      console.error("[-] Error logging in:", error.response?.data || error.message);
      return null;
    }
  }

  async addInviteCode(code: string): Promise<any> {
    if (!this.loggedIn) {
      console.log("[-] Must be logged in to add invite code");
      return null;
    }

    // Get userId from session
    let userId: string | null = null;
    try {
      const sessionResponse = await this.session.get("/api/auth/session");
      const sessionData = sessionResponse.data;
      if (sessionData && sessionData.user) {
        userId = sessionData.user.id;
      }
    } catch (error) {
      console.error("[-] Error getting userId:", error);
    }

    if (!userId) {
      console.log("[-] Could not get userId");
      return null;
    }

    const data = {
      "0": {
        json: {
          code,
          userId
        }
      }
    };

    try {
      const response = await this.session.post(
        "/api/trpc/earns.addInviteCode?batch=1",
        data
      );

      console.log(`[*] Add invite code: ${response.status}`);
      console.log(`[*] Response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      console.error("[-] Error adding code:", error.response?.data || error.message);
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

  console.log(`[*] Registering account...`);
  console.log(`    - Name: ${username}`);
  console.log(`    - Email: ${tempMailAccount.email}`);
  console.log(`    - Password: ${password}`);
  console.log(`    - Age: ${age}`);
  console.log(`    - Gender: ${gender}`);

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
      error: "Failed to register account"
    };
  }

  // Send verification code
  console.log("[*] Requesting verification code...");
  await starzy.sendVerificationCode(tempMailAccount.email);

  // Wait for email
  console.log("[*] Waiting for verification email...");
  const emailData = await waitForEmailFn(tempMailAccount, "verif", 120);

  let verificationCode: string | null = null;
  let emailVerified = false;

  if (emailData) {
    verificationCode = extractCodeFn(emailData, tempMailAccount.provider);

    if (verificationCode) {
      console.log(`[+] Verification code extracted: ${verificationCode}`);
      emailVerified = await starzy.verifyCode(tempMailAccount.email, verificationCode);
    } else {
      console.log("[-] Could not extract verification code");
    }
  } else {
    console.log("[-] No verification email received");
  }

  // Login
  console.log("[*] Logging in...");
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
  console.log(`[*] Applying code ${code} to account ${refEmail}...`);

  const client = new StarzyPlayClient();

  // Login
  const loginResult = await client.login(refEmail, refPassword);
  if (!loginResult) {
    return {
      success: false,
      error: "Failed to login to reference account"
    };
  }

  // Add invite code
  const result = await client.addInviteCode(code);

  if (result) {
    if (Array.isArray(result) && result.length > 0) {
      const responseData = result[0];

      // Check success
      if (responseData?.result?.data?.json?.success) {
        console.log(`[+] Code ${code} applied successfully! +20 stars`);
        return { success: true };
      }

      // Check if already used
      const error = responseData?.error || {};
      const errorMsg = JSON.stringify(error).toLowerCase();
      if (errorMsg.includes("já") || errorMsg.includes("already") || errorMsg.includes("usado")) {
        console.log(`[!] Code ${code} was already used`);
        return { success: false, alreadyUsed: true };
      }
    }
  }

  console.log(`[-] Failed to apply code ${code}`);
  return { success: false, error: "Failed to apply code" };
}
