/**
 * Drizzle schema — single source of truth del modelo de datos (§4 de CLAUDE.md).
 *
 * Reglas:
 * - Dinero/precios en `numeric` (nunca float) → Drizzle los devuelve como string.
 * - Timestamps `withTimezone` en UTC.
 * - Todo se llavea por `account_id`; la cuenta cuelga del usuario.
 * - Las métricas de rendimiento salen SOLO de `trades` (transactions aparte).
 *
 * Las políticas RLS y el trigger auth.users → public.users se añaden en el
 * slice de auth (migración custom de Drizzle).
 */
import { relations, sql } from "drizzle-orm";
import {
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ──────────────────────────────── Enums ──────────────────────────────── */

export const userRole = pgEnum("user_role", ["super_admin", "user"]);
export const accountStatus = pgEnum("account_status", ["active", "archived"]);
export const tradeDirection = pgEnum("trade_direction", ["long", "short"]);
export const tradeResult = pgEnum("trade_result", ["win", "loss", "breakeven"]);
export const tradeSession = pgEnum("trade_session", [
  "asia",
  "london",
  "newyork",
  "overlap",
  "other",
]);
export const txType = pgEnum("tx_type", ["deposit", "withdrawal"]);
export const evaluationVerdict = pgEnum("evaluation_verdict", [
  "blocked",
  "category_a",
  "category_b",
  "category_c",
]);

/* Tipos numéricos reutilizables */
const money = { precision: 20, scale: 8 } as const; // P&L, precios, montos
const ratio = { precision: 12, scale: 4 } as const; // R:R, leverage, %

/* ──────────────────────────────── users ──────────────────────────────── */
// id = auth.users.id de Supabase (mismo uuid).
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: userRole("role").notNull().default("user"),
  maxAccounts: integer("max_accounts").notNull().default(1),
  locale: text("locale").notNull().default("es"),
  theme: text("theme").notNull().default("system"),
  selectedAccountIds: uuid("selected_account_ids")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────────── accounts ───────────────────────────── */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: accountStatus("status").notNull().default("active"),
  exchange: text("exchange"),
  currency: text("currency").notNull().default("USD"),
  startingBalance: numeric("starting_balance", money).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────────── setups ─────────────────────────────── */
export const setups = pgTable("setups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────── pre_trade_evaluations ──────────────────────── */
// Referencia circular con trades (linked_trade_id ↔ evaluation_id) → forward ref.
export const preTradeEvaluations = pgTable("pre_trade_evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  verdict: evaluationVerdict("verdict").notNull(),
  assignedRiskPct: numeric("assigned_risk_pct", ratio),
  linkedTradeId: uuid("linked_trade_id").references(
    (): AnyPgColumn => trades.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────────── trades ─────────────────────────────── */
export const trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  direction: tradeDirection("direction").notNull(),
  result: tradeResult("result").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  entryPrice: numeric("entry_price", money),
  exitPrice: numeric("exit_price", money),
  quantity: numeric("quantity", money),
  leverage: numeric("leverage", ratio),
  fees: numeric("fees", money).notNull().default("0"),
  grossPnl: numeric("gross_pnl", money).notNull(),
  netPnl: numeric("net_pnl", money).notNull(),
  plannedRr: numeric("planned_rr", ratio),
  realizedRr: numeric("realized_rr", ratio),
  riskAmount: numeric("risk_amount", money),
  session: tradeSession("session"),
  setupId: uuid("setup_id").references(() => setups.id, {
    onDelete: "set null",
  }),
  evaluationId: uuid("evaluation_id").references(
    () => preTradeEvaluations.id,
    { onDelete: "set null" },
  ),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────── transactions ───────────────────────────── */
// Depósitos / retiros — SEPARADO de trades. Nunca toca métricas de rendimiento.
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  type: txType("type").notNull(),
  amount: numeric("amount", money).notNull(), // positivo; el signo lo da `type`
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────────── tags ───────────────────────────────── */
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
});

export const tradeTags = pgTable(
  "trade_tags",
  {
    tradeId: uuid("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.tradeId, t.tagId] })],
);

/* ──────────────────────────── screenshots ────────────────────────────── */
// Solo la ruta; el archivo vive en el bucket de Storage.
export const screenshots = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradeId: uuid("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────── daily_prep ─────────────────────────────── */
export const dailyPrep = pgTable(
  "daily_prep",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    date: date("date").notNull(),
    notes: text("notes"),
    checklist: jsonb("checklist"),
    score: integer("score"),
    maxScore: integer("max_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("daily_prep_user_date_unique").on(t.userId, t.date)],
);

/* ─────────────────────────── journal_entries ─────────────────────────── */
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "cascade",
  }),
  date: date("date").notNull(),
  title: text("title"),
  content: text("content"),
  template: text("template"),
  folder: text("folder"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ──────────────────────────── relations ──────────────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  setups: many(setups),
  tags: many(tags),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  trades: many(trades),
  transactions: many(transactions),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  account: one(accounts, {
    fields: [trades.accountId],
    references: [accounts.id],
  }),
  setup: one(setups, { fields: [trades.setupId], references: [setups.id] }),
  screenshots: many(screenshots),
  tradeTags: many(tradeTags),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const tradeTagsRelations = relations(tradeTags, ({ one }) => ({
  trade: one(trades, { fields: [tradeTags.tradeId], references: [trades.id] }),
  tag: one(tags, { fields: [tradeTags.tagId], references: [tags.id] }),
}));

export const screenshotsRelations = relations(screenshots, ({ one }) => ({
  trade: one(trades, {
    fields: [screenshots.tradeId],
    references: [trades.id],
  }),
}));
