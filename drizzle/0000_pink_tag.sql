CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_price_cents` integer,
	`categories_json` text DEFAULT '[]' NOT NULL,
	`sizes_json` text DEFAULT '[]' NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`vendor` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_updated_at_idx` ON `products` (`updated_at`);