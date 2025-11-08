-- ######################################################
-- # TLIMS Database Schema (Based on PHP Source Code) #
-- ######################################################

-- I-create ang Database (Kon wala pa na-create)
CREATE DATABASE IF NOT EXISTS `tlims_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `tlims_db`;

-- Drop Tables (optional, for clean recreation)
-- DROP TABLE IF EXISTS `user_favorites`;
-- DROP TABLE IF EXISTS `notifications`;
-- DROP TABLE IF EXISTS `messages`;
-- DROP TABLE IF EXISTS `inquiries`;
-- DROP TABLE IF EXISTS `bookings`;
-- DROP TABLE IF EXISTS `rooms`;
-- DROP TABLE IF EXISTS `properties`;
-- DROP TABLE IF EXISTS `landlords`;
-- DROP TABLE IF EXISTS `tenants`;
-- DROP TABLE IF EXISTS `room_types`;
-- DROP TABLE IF EXISTS `users`;


-- 1. USERS Table (Main Authentication Table)
CREATE TABLE `users` (
  `user_id` INT(11) NOT NULL AUTO_INCREMENT,
  `fullname` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('tenant','landlord') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. LANDLORDS Table (User Role Specific)
CREATE TABLE `landlords` (
  `landlord_id` INT(11) NOT NULL, -- Foreign Key to users.user_id
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`landlord_id`),
  FOREIGN KEY (`landlord_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TENANTS Table (User Role Specific)
CREATE TABLE `tenants` (
  `id` INT(11) NOT NULL, -- Foreign Key to users.user_id
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ROOM_TYPES Table (Used by properties and rooms)
CREATE TABLE `room_types` (
  `room_type_id` INT(11) NOT NULL AUTO_INCREMENT,
  `type_name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  PRIMARY KEY (`room_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. PROPERTIES Table (Listing Details)
CREATE TABLE `properties` (
  `property_id` INT(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` INT(11) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `address` VARCHAR(255) NOT NULL, -- Used as 'location' in JS
  `price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('available','rented','maintenance') NOT NULL DEFAULT 'available',
  `property_type` VARCHAR(50) DEFAULT NULL,
  `amenities` TEXT, -- Stores comma-separated or JSON list
  `images` JSON DEFAULT NULL, -- Stores JSON array of image paths
  `room_type_id` INT(11) DEFAULT NULL,
  `bedrooms` INT(3) DEFAULT 1, -- Added for convenience, though rooms table has bed_count
  `bathrooms` INT(3) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`property_id`),
  FOREIGN KEY (`landlord_id`) REFERENCES `landlords`(`landlord_id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`room_type_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. ROOMS Table (Room inventory, linked to property)
CREATE TABLE `rooms` (
  `room_id` INT(11) NOT NULL AUTO_INCREMENT,
  `property_id` INT(11) NOT NULL,
  `room_type_id` INT(11) DEFAULT NULL,
  `room_number` VARCHAR(50) NOT NULL,
  `rent_amount` DECIMAL(10,2) NOT NULL,
  `bed_count` INT(3) NOT NULL DEFAULT 1, -- Used as 'bedrooms' in your JS/PHP
  `status` ENUM('available','rented','maintenance') NOT NULL DEFAULT 'available',
  PRIMARY KEY (`room_id`),
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`property_id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`room_type_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. BOOKINGS Table (Booking requests)
CREATE TABLE `bookings` (
  `booking_id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) NOT NULL,
  `landlord_id` INT(11) NOT NULL,
  `property_id` INT(11) NOT NULL,
  `booking_date` DATE NOT NULL,
  `status` ENUM('pending','confirmed','declined') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`landlord_id`) REFERENCES `landlords`(`landlord_id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`property_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. INQUIRIES Table (Tenant inquiries/messages via contact form)
CREATE TABLE `inquiries` (
  `inquiry_id` INT(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` INT(11) NOT NULL,
  `landlord_id` INT(11) NOT NULL,
  `property_id` INT(11) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT 'General Inquiry',
  `message` TEXT NOT NULL,
  `status` ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`inquiry_id`),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`landlord_id`) REFERENCES `landlords`(`landlord_id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`property_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. MESSAGES Table (Chat system)
CREATE TABLE `messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` INT(11) NOT NULL,
  `receiver_id` INT(11) NOT NULL, -- Tenant ID (as determined by your foreign key logs)
  `message_text` TEXT NOT NULL,
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_read` BOOLEAN NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  -- Kining foreign key mao ang source sa issue. Kinahanglan mo-refer sa TENANTS table.
  -- Giusab ni aron kanunay i-check ang Tenant ID (sa usa ka chat thread)
  FOREIGN KEY (`receiver_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, 
  FOREIGN KEY (`landlord_id`) REFERENCES `landlords`(`landlord_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 10. NOTIFICATIONS Table
CREATE TABLE `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL, -- Target user ID (Landlord ID or Tenant ID)
  `role` ENUM('tenant','landlord') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `type` ENUM('message','booking','system') NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  -- Walay foreign key dinhi tungod kay ang user_id mahimong Tenant ID o Landlord ID
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. USER_FAVORITES Table
CREATE TABLE `user_favorites` (
  `favorite_id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL, -- Tenant ID
  `property_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`favorite_id`),
  UNIQUE KEY `unique_favorite` (`user_id`, `property_id`), -- Dili pwedeng duha ang favorite
  FOREIGN KEY (`user_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`property_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ######################################################
-- # DEMO DATA (OPTIONAL)
-- ######################################################

-- Insert a demo user: John (Tenant)
-- INSERT INTO users (fullname, email, password, role) VALUES ('John Smith', 'john@student.edu', '$2y$10$t.y.p.e.d.h.a.s.h.h.e.r.e', 'tenant');
-- INSERT INTO tenants (id, name) VALUES (LAST_INSERT_ID(), 'John Smith');

-- Insert a demo user: Sarah (Landlord)
-- INSERT INTO users (fullname, email, password, role) VALUES ('Sarah Johnson', 'sarah@landlord.com', '$2y$10$t.y.p.e.d.h.a.s.h.h.e.r.e', 'landlord');
-- INSERT INTO landlords (landlord_id, full_name) VALUES (LAST_INSERT_ID(), 'Sarah Johnson');