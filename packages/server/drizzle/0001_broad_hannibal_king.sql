CREATE TABLE "crew_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"crew_id" text NOT NULL,
	"token" text NOT NULL,
	"created_by_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "crew_invites" ADD CONSTRAINT "crew_invites_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_invites" ADD CONSTRAINT "crew_invites_created_by_account_id_user_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crew_invites_token_idx" ON "crew_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "crew_invites_crewId_idx" ON "crew_invites" USING btree ("crew_id");