import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  saveCreatedAccount: vi.fn().mockResolvedValue({ insertId: 1 }),
  getCreatedAccounts: vi.fn().mockResolvedValue([
    {
      id: 1,
      referenceCode: "ABC123",
      email: "test@example.com",
      username: "testuser",
      password: "Test123!",
      age: 25,
      gender: "masculino",
      inviteCodeUsed: "6247C5",
      emailVerified: true,
      loginSuccess: true,
      codeApplied: false,
      createdAt: new Date(),
    },
  ]),
  getUnusedCodes: vi.fn().mockResolvedValue([
    {
      id: 1,
      referenceCode: "ABC123",
      email: "test@example.com",
      username: "testuser",
      password: "Test123!",
      age: 25,
      gender: "masculino",
      inviteCodeUsed: "6247C5",
      emailVerified: true,
      loginSuccess: true,
      codeApplied: false,
      createdAt: new Date(),
    },
  ]),
  markCodeAsApplied: vi.fn().mockResolvedValue(true),
  addLog: vi.fn().mockResolvedValue({ insertId: 1 }),
  getLogs: vi.fn().mockResolvedValue([
    {
      id: 1,
      type: "info",
      operation: "create_account",
      message: "Test log message",
      details: null,
      createdAt: new Date(),
    },
  ]),
  clearLogs: vi.fn().mockResolvedValue(true),
  getOrCreateStatistics: vi.fn().mockResolvedValue({
    id: 1,
    accountsCreated: 5,
    codesAppliedSuccess: 3,
    codesAppliedFailed: 1,
    codesAlreadyUsed: 1,
    starsEarned: 60,
    updatedAt: new Date(),
  }),
  updateStatistics: vi.fn().mockResolvedValue({
    id: 1,
    accountsCreated: 6,
    codesAppliedSuccess: 3,
    codesAppliedFailed: 1,
    codesAlreadyUsed: 1,
    starsEarned: 60,
    updatedAt: new Date(),
  }),
  resetStatistics: vi.fn().mockResolvedValue({
    id: 1,
    accountsCreated: 0,
    codesAppliedSuccess: 0,
    codesAppliedFailed: 0,
    codesAlreadyUsed: 0,
    starsEarned: 0,
    updatedAt: new Date(),
  }),
}));

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("accounts router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list created accounts", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.accounts.list({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("referenceCode", "ABC123");
    expect(result[0]).toHaveProperty("email", "test@example.com");
  });

  it("should list unused codes", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.accounts.unused();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("codeApplied", false);
  });
});

describe("logs router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list logs", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.logs.list({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("type", "info");
    expect(result[0]).toHaveProperty("operation", "create_account");
  });

  it("should clear logs", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.logs.clear();

    expect(result).toEqual({ success: true });
  });
});

describe("statistics router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get statistics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.statistics.get();

    expect(result).toHaveProperty("accountsCreated", 5);
    expect(result).toHaveProperty("codesAppliedSuccess", 3);
    expect(result).toHaveProperty("starsEarned", 60);
  });

  it("should reset statistics", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.statistics.reset();

    expect(result).toHaveProperty("accountsCreated", 0);
    expect(result).toHaveProperty("codesAppliedSuccess", 0);
    expect(result).toHaveProperty("starsEarned", 0);
  });
});
