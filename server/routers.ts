import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  saveCreatedAccount, 
  getCreatedAccounts, 
  getUnusedCodes, 
  markCodeAsApplied,
  addLog,
  getLogs,
  clearLogs,
  getOrCreateStatistics,
  updateStatistics,
  resetStatistics
} from "./db";
import { 
  createTempMailAccount, 
  waitForEmail, 
  extractVerificationCode 
} from "./services/tempmail";
import { 
  createNewAccount, 
  applyInviteCode,
  testLogin
} from "./services/starzyplay";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==========================================
  // AUTOMATION ROUTES
  // ==========================================

  automation: router({
    // Create a new account
    createAccount: publicProcedure
      .input(z.object({
        inviteCode: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { inviteCode } = input;

        // Log start
        await addLog({
          type: "info",
          operation: "create_account",
          message: `Iniciando criação de conta com código ${inviteCode}`,
        });

        try {
          // Create temp email
          await addLog({
            type: "info",
            operation: "create_account",
            message: "Criando email temporário...",
          });

          const tempMail = await createTempMailAccount();
          if (!tempMail) {
            await addLog({
              type: "error",
              operation: "create_account",
              message: "Falha ao criar email temporário",
            });
            return { success: false, error: "Falha ao criar email temporário" };
          }

          await addLog({
            type: "success",
            operation: "create_account",
            message: `Email temporário criado: ${tempMail.email}`,
          });

          // Create account
          await addLog({
            type: "info",
            operation: "create_account",
            message: "Registrando conta no StarzyPlay...",
          });

          const result = await createNewAccount(
            inviteCode,
            tempMail,
            waitForEmail,
            extractVerificationCode
          );

          if (!result.success) {
            await addLog({
              type: "error",
              operation: "create_account",
              message: result.error || "Falha ao criar conta",
            });
            return { success: false, error: result.error };
          }

          // Save to database
          if (result.newInviteCode) {
            await saveCreatedAccount({
              referenceCode: result.newInviteCode,
              email: result.email!,
              username: result.username!,
              password: result.password!,
              age: result.age!,
              gender: result.gender!,
              inviteCodeUsed: result.inviteCodeUsed,
              emailVerified: result.emailVerified || false,
              loginSuccess: result.loginSuccess || false,
              codeApplied: false,
            });

            await updateStatistics({ accountsCreated: 1 });

            await addLog({
              type: "success",
              operation: "create_account",
              message: `Conta criada com sucesso! Código: ${result.newInviteCode}`,
              details: JSON.stringify({
                email: result.email,
                username: result.username,
                inviteCode: result.newInviteCode,
                emailVerified: result.emailVerified,
                loginSuccess: result.loginSuccess,
              }),
            });
          }

          return { success: true, data: result };
        } catch (error: any) {
          await addLog({
            type: "error",
            operation: "create_account",
            message: `Erro: ${error.message}`,
          });
          return { success: false, error: error.message };
        }
      }),

    // Apply invite code to reference account
    applyCode: publicProcedure
      .input(z.object({
        code: z.string().min(1),
        accountId: z.number().optional(),
        refEmail: z.string().email(),
        refPassword: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { code, accountId, refEmail, refPassword } = input;

        await addLog({
          type: "info",
          operation: "apply_code",
          message: `Aplicando código ${code} na conta ${refEmail}...`,
        });

        try {
          const result = await applyInviteCode(code, refEmail, refPassword);

          if (result.success) {
            if (accountId) {
              await markCodeAsApplied(accountId);
            }
            await updateStatistics({ codesAppliedSuccess: 1 });

            await addLog({
              type: "success",
              operation: "apply_code",
              message: `Código ${code} aplicado com sucesso! +20 estrelas`,
            });
          } else if (result.alreadyUsed) {
            if (accountId) {
              await markCodeAsApplied(accountId);
            }
            await updateStatistics({ codesAlreadyUsed: 1 });

            await addLog({
              type: "warning",
              operation: "apply_code",
              message: `Código ${code} já foi usado anteriormente`,
            });
          } else {
            await updateStatistics({ codesAppliedFailed: 1 });

            await addLog({
              type: "error",
              operation: "apply_code",
              message: `Falha ao aplicar código ${code}: ${result.error}`,
            });
          }

          return result;
        } catch (error: any) {
          await addLog({
            type: "error",
            operation: "apply_code",
            message: `Erro: ${error.message}`,
          });
          return { success: false, error: error.message };
        }
      }),

    // Test login
    testLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { email, password } = input;

        await addLog({
          type: "info",
          operation: "test_login",
          message: `Testando login com ${email}...`,
        });

        try {
          const result = await testLogin(email, password);

          if (result.success) {
            await addLog({
              type: "success",
              operation: "test_login",
              message: `Login bem-sucedido! Usuário: ${result.user?.name}`,
              details: JSON.stringify(result.user),
            });
          } else {
            await addLog({
              type: "error",
              operation: "test_login",
              message: `Falha no login: ${result.error}`,
            });
          }

          return result;
        } catch (error: any) {
          await addLog({
            type: "error",
            operation: "test_login",
            message: `Erro: ${error.message}`,
          });
          return { success: false, error: error.message };
        }
      }),

    // Apply all unused codes
    applyAllCodes: publicProcedure
      .input(z.object({
        refEmail: z.string().email(),
        refPassword: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { refEmail, refPassword } = input;

        await addLog({
          type: "info",
          operation: "apply_all_codes",
          message: `Iniciando aplicação de todos os códigos na conta ${refEmail}...`,
        });

        const unusedCodes = await getUnusedCodes();

        if (unusedCodes.length === 0) {
          await addLog({
            type: "warning",
            operation: "apply_all_codes",
            message: "Nenhum código disponível para aplicar",
          });
          return { success: true, applied: 0, failed: 0, alreadyUsed: 0 };
        }

        await addLog({
          type: "info",
          operation: "apply_all_codes",
          message: `${unusedCodes.length} código(s) encontrado(s)`,
        });

        let applied = 0;
        let failed = 0;
        let alreadyUsed = 0;

        for (const account of unusedCodes) {
          const result = await applyInviteCode(account.referenceCode, refEmail, refPassword);

          if (result.success) {
            await markCodeAsApplied(account.id);
            await updateStatistics({ codesAppliedSuccess: 1 });
            applied++;

            await addLog({
              type: "success",
              operation: "apply_all_codes",
              message: `Código ${account.referenceCode} aplicado com sucesso! +20 estrelas`,
            });
          } else if (result.alreadyUsed) {
            await markCodeAsApplied(account.id);
            await updateStatistics({ codesAlreadyUsed: 1 });
            alreadyUsed++;

            await addLog({
              type: "warning",
              operation: "apply_all_codes",
              message: `Código ${account.referenceCode} já foi usado`,
            });
          } else {
            await updateStatistics({ codesAppliedFailed: 1 });
            failed++;

            await addLog({
              type: "error",
              operation: "apply_all_codes",
              message: `Falha ao aplicar código ${account.referenceCode}`,
            });
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await addLog({
          type: "info",
          operation: "apply_all_codes",
          message: `Concluído: ${applied} aplicados, ${alreadyUsed} já usados, ${failed} falhas`,
        });

        return { success: true, applied, failed, alreadyUsed };
      }),
  }),

  // ==========================================
  // DATA ROUTES
  // ==========================================

  accounts: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional().default(100) }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 100;
        return await getCreatedAccounts(limit);
      }),

    unused: publicProcedure.query(async () => {
      return await getUnusedCodes();
    }),
  }),

  logs: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional().default(100) }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit || 100;
        return await getLogs(limit);
      }),

    clear: publicProcedure.mutation(async () => {
      await clearLogs();
      return { success: true };
    }),
  }),

  statistics: router({
    get: publicProcedure.query(async () => {
      return await getOrCreateStatistics();
    }),

    reset: publicProcedure.mutation(async () => {
      return await resetStatistics();
    }),
  }),
});

export type AppRouter = typeof appRouter;
