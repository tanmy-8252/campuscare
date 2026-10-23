CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`account_id` text NOT NULL,
	`password_hash` text,
	`access_token` text,
	`refresh_token` text,
	`expires_at` integer,
	`created_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_unique` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`name` text,
	`password_hash` text,
	`role` text DEFAULT 'resident' NOT NULL,
	`chat_gpt_user_id` text,
	`created_at` integer DEFAULT '"2026-10-23T11:43:26.203Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2026-10-23T11:43:26.203Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_chat_gpt_user_id_unique` ON `users` (`chat_gpt_user_id`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `created_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `updated_at` integer DEFAULT '"2026-10-23T11:43:26.204Z"' NOT NULL;