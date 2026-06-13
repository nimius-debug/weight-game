CREATE TYPE "public"."cadence" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('upcoming', 'active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."weigh_in_source" AS ENUM('web', 'sms');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('lb', 'kg');--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "challenge_status" DEFAULT 'active' NOT NULL,
	"cadence" "cadence" DEFAULT 'daily' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"baseline_weight" double precision NOT NULL,
	"unit" "weight_unit" DEFAULT 'lb' NOT NULL,
	"access_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "weigh_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"weight" double precision NOT NULL,
	"unit" "weight_unit" DEFAULT 'lb' NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" "weigh_in_source" DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weigh_ins" ADD CONSTRAINT "weigh_ins_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_challenge_user_unique" ON "participants" USING btree ("challenge_id","user_id");