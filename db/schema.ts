import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ============================================
// Authentication Tables (Better Auth compatible)
// ============================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  name: text("name"),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["resident", "worker", "admin"] }).notNull().default("resident"),
  chatGptUserId: text("chat_gpt_user_id").unique(), // For backward compatibility with ChatGPT auth
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  passwordHash: text("password_hash"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
}, (table) => [
  uniqueIndex("accounts_provider_account_unique").on(table.providerId, table.accountId),
]);

export const verificationTokens = sqliteTable("verification_tokens", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // email
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  type: text("type", { enum: ["email_verification", "password_reset"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

// ============================================
// Existing Workspace Tables (Extended)
// ============================================

export const workspaces = sqliteTable("workspaces", {
  ownerId: text("owner_id").primaryKey(), // ChatGPT user ID (legacy)
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // New: internal user ID
  data: text("data").notNull(),
  version: integer("version").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
});
