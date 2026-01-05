import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, createdAccounts, InsertCreatedAccount, operationLogs, InsertOperationLog, statistics } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==========================================
// FUNÇÕES PARA CONTAS CRIADAS
// ==========================================

export async function saveCreatedAccount(account: InsertCreatedAccount) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save account: database not available");
    return null;
  }

  try {
    const result = await db.insert(createdAccounts).values(account);
    return result;
  } catch (error) {
    console.error("[Database] Failed to save account:", error);
    throw error;
  }
}

export async function getCreatedAccounts(limit = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get accounts: database not available");
    return [];
  }

  try {
    const result = await db.select().from(createdAccounts).orderBy(desc(createdAccounts.createdAt)).limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get accounts:", error);
    return [];
  }
}

export async function getUnusedCodes() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get unused codes: database not available");
    return [];
  }

  try {
    const result = await db.select().from(createdAccounts).where(eq(createdAccounts.codeApplied, false)).orderBy(desc(createdAccounts.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get unused codes:", error);
    return [];
  }
}

export async function markCodeAsApplied(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update code: database not available");
    return null;
  }

  try {
    const result = await db.update(createdAccounts).set({ codeApplied: true }).where(eq(createdAccounts.id, id));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update code:", error);
    throw error;
  }
}

// ==========================================
// FUNÇÕES PARA LOGS
// ==========================================

export async function addLog(log: InsertOperationLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add log: database not available");
    return null;
  }

  try {
    const result = await db.insert(operationLogs).values(log);
    return result;
  } catch (error) {
    console.error("[Database] Failed to add log:", error);
    return null;
  }
}

export async function getLogs(limit = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get logs: database not available");
    return [];
  }

  try {
    const result = await db.select().from(operationLogs).orderBy(desc(operationLogs.createdAt)).limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get logs:", error);
    return [];
  }
}

export async function clearLogs() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot clear logs: database not available");
    return null;
  }

  try {
    await db.delete(operationLogs);
    return true;
  } catch (error) {
    console.error("[Database] Failed to clear logs:", error);
    return false;
  }
}

// ==========================================
// FUNÇÕES PARA ESTATÍSTICAS
// ==========================================

export async function getOrCreateStatistics() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get statistics: database not available");
    return null;
  }

  try {
    const result = await db.select().from(statistics).limit(1);
    if (result.length === 0) {
      await db.insert(statistics).values({});
      const newResult = await db.select().from(statistics).limit(1);
      return newResult[0] || null;
    }
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get statistics:", error);
    return null;
  }
}

export async function updateStatistics(updates: Partial<{
  accountsCreated: number;
  codesAppliedSuccess: number;
  codesAppliedFailed: number;
  codesAlreadyUsed: number;
  starsEarned: number;
}>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update statistics: database not available");
    return null;
  }

  try {
    const current = await getOrCreateStatistics();
    if (!current) return null;

    const newValues: Record<string, number> = {};
    if (updates.accountsCreated !== undefined) {
      newValues.accountsCreated = current.accountsCreated + updates.accountsCreated;
    }
    if (updates.codesAppliedSuccess !== undefined) {
      newValues.codesAppliedSuccess = current.codesAppliedSuccess + updates.codesAppliedSuccess;
      newValues.starsEarned = current.starsEarned + (updates.codesAppliedSuccess * 20);
    }
    if (updates.codesAppliedFailed !== undefined) {
      newValues.codesAppliedFailed = current.codesAppliedFailed + updates.codesAppliedFailed;
    }
    if (updates.codesAlreadyUsed !== undefined) {
      newValues.codesAlreadyUsed = current.codesAlreadyUsed + updates.codesAlreadyUsed;
    }

    if (Object.keys(newValues).length > 0) {
      await db.update(statistics).set(newValues).where(eq(statistics.id, current.id));
    }

    return await getOrCreateStatistics();
  } catch (error) {
    console.error("[Database] Failed to update statistics:", error);
    return null;
  }
}

export async function resetStatistics() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot reset statistics: database not available");
    return null;
  }

  try {
    const current = await getOrCreateStatistics();
    if (!current) return null;

    await db.update(statistics).set({
      accountsCreated: 0,
      codesAppliedSuccess: 0,
      codesAppliedFailed: 0,
      codesAlreadyUsed: 0,
      starsEarned: 0,
    }).where(eq(statistics.id, current.id));

    return await getOrCreateStatistics();
  } catch (error) {
    console.error("[Database] Failed to reset statistics:", error);
    return null;
  }
}
