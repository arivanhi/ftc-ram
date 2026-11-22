ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "borrower_email" text;
--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "return_reminder_sent_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smtp_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"smtp_host" text DEFAULT 'smtp.gmail.com' NOT NULL,
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"smtp_user" text DEFAULT '' NOT NULL,
	"smtp_password_enc" text DEFAULT '' NOT NULL,
	"sender_name" text DEFAULT 'SIM-Aset Penelitian FTC UDINUS' NOT NULL,
	"admin_notify_email" text DEFAULT '' NOT NULL,
	"reminder_hours_before" integer DEFAULT 24 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
