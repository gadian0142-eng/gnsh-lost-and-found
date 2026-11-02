CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`found_at` text NOT NULL,
	`found_on` text NOT NULL,
	`kept_at` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'keeping' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `items_newest` ON `items` (`created`,`id`);--> statement-breakpoint
CREATE INDEX `items_owner` ON `items` (`owner`);