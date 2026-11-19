CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"specifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"condition" text DEFAULT 'prima' NOT NULL,
	"availability" text DEFAULT 'tersedia' NOT NULL,
	"completion_date" date NOT NULL,
	"research_scheme" text,
	"researcher_team" text,
	"photo_url" text,
	"room_id" uuid,
	"placement_detail" text,
	"contact_id" uuid,
	"usage_summary" text,
	"is_priority" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_inventory_code_unique" UNIQUE("inventory_code")
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'domain' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"role_title" text NOT NULL,
	"specialization" text DEFAULT '' NOT NULL,
	"room_label" text DEFAULT '' NOT NULL,
	"duty_hours" text DEFAULT '08:00 - 16:00 WIB' NOT NULL,
	"availability_status" text DEFAULT 'available' NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text NOT NULL,
	"photo_url" text,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"building_id" uuid NOT NULL,
	"floor_number" integer NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" text NOT NULL,
	"asset_id" uuid,
	"asset_code_input" text NOT NULL,
	"reporter_name" text NOT NULL,
	"reporter_contact" text NOT NULL,
	"category" text DEFAULT 'kerusakan' NOT NULL,
	"urgency" text DEFAULT 'sedang' NOT NULL,
	"description" text NOT NULL,
	"photo_url" text,
	"assigned_contact_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_tickets_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "loan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"return_condition" text,
	"return_notes" text
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" text NOT NULL,
	"borrower_name" text NOT NULL,
	"borrower_id_type" text NOT NULL,
	"borrower_id_value" text NOT NULL,
	"borrower_whatsapp" text NOT NULL,
	"borrower_unit_detail" text,
	"purpose_title" text NOT NULL,
	"usage_location_type" text DEFAULT 'internal' NOT NULL,
	"external_location_detail" text,
	"funding_category" text DEFAULT 'Pameran / Expo FTC' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"daily_session" text DEFAULT 'Sesi Penuh (08.00 - 17.00 WIB)' NOT NULL,
	"attachment_url" text,
	"integrity_agreed" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"approved_at" timestamp with time zone,
	"borrowed_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"pic_name" text DEFAULT '' NOT NULL,
	"pic_ext" text DEFAULT '' NOT NULL,
	"capacity" integer DEFAULT 10 NOT NULL,
	"operating_hours" text DEFAULT '08.00 - 16.30 WIB' NOT NULL,
	"grid_zone" text DEFAULT 'top' NOT NULL,
	"grid_col_span" integer DEFAULT 4 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tutorials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_code" text NOT NULL,
	"asset_id" uuid,
	"title" text NOT NULL,
	"category" text DEFAULT 'pengoperasian' NOT NULL,
	"format" text DEFAULT 'panduan_teks' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"steps_markdown" text,
	"file_url" text,
	"video_url" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"instructor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutorials_doc_code_unique" UNIQUE("doc_code")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_tickets" ADD CONSTRAINT "issue_tickets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_tickets" ADD CONSTRAINT "issue_tickets_assigned_contact_id_contacts_id_fk" FOREIGN KEY ("assigned_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "loan_items_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "loan_items_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "floors_building_number_idx" ON "floors" USING btree ("building_id","floor_number");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_items_loan_asset_idx" ON "loan_items" USING btree ("loan_id","asset_id");