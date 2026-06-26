ALTER TABLE "participants" ALTER COLUMN "baseline_weight" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "baseline_photo_url" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "final_photo_url" text;