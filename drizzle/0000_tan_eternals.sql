CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`data` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`record` text NOT NULL,
	`data` text NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`user` text PRIMARY KEY NOT NULL,
	`initialized` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
