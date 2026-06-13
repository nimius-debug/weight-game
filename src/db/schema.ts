import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const challengeStatus = pgEnum("challenge_status", [
  "upcoming",
  "active",
  "ended",
]);
export const cadence = pgEnum("cadence", ["daily", "weekly"]);
export const weightUnit = pgEnum("weight_unit", ["lb", "kg"]);
export const weighInSource = pgEnum("weigh_in_source", ["web", "sms"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Nullable for now; becomes the join key once the SMS path is added.
  phone: text("phone").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: challengeStatus("status").notNull().default("active"),
  cadence: cadence("cadence").notNull().default("daily"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    baselineWeight: doublePrecision("baseline_weight").notNull(),
    unit: weightUnit("unit").notNull().default("lb"),
    // Passwordless personal-link token: /u/[accessToken]
    accessToken: uuid("access_token").notNull().defaultRandom().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("participant_challenge_user_unique").on(
      t.challengeId,
      t.userId,
    ),
  ],
);

export const weighIns = pgTable("weigh_ins", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  weight: doublePrecision("weight").notNull(),
  unit: weightUnit("unit").notNull().default("lb"),
  loggedAt: timestamp("logged_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  source: weighInSource("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type WeighIn = typeof weighIns.$inferSelect;
