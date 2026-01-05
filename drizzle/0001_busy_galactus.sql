CREATE TABLE `created_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceCode` varchar(10) NOT NULL,
	`email` varchar(320) NOT NULL,
	`username` varchar(100) NOT NULL,
	`password` varchar(100) NOT NULL,
	`age` int NOT NULL,
	`gender` varchar(20) NOT NULL,
	`inviteCodeUsed` varchar(10),
	`emailVerified` boolean NOT NULL DEFAULT false,
	`loginSuccess` boolean NOT NULL DEFAULT false,
	`codeApplied` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `created_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('info','success','error','warning') NOT NULL DEFAULT 'info',
	`operation` varchar(50) NOT NULL,
	`message` text NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountsCreated` int NOT NULL DEFAULT 0,
	`codesAppliedSuccess` int NOT NULL DEFAULT 0,
	`codesAppliedFailed` int NOT NULL DEFAULT 0,
	`codesAlreadyUsed` int NOT NULL DEFAULT 0,
	`starsEarned` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
