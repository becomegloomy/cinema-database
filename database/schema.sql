-- Создание базы данных
CREATE SCHEMA IF NOT EXISTS `кинотеатр` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `кинотеатр`;

-- Таблица: cinema
CREATE TABLE IF NOT EXISTS `cinema` (
  `cinema_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(20) NOT NULL,
  `address` VARCHAR(50) NOT NULL, 
  `phone` VARCHAR(11) NOT NULL,
  `email` VARCHAR(50) NOT NULL,
  `director` VARCHAR(30) NOT NULL,
  `accountant` VARCHAR(30) NOT NULL,
  `details` VARCHAR(90) NOT NULL,
  `inn` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`cinema_id`)
) ENGINE = InnoDB;

-- Таблица: hall_type
CREATE TABLE IF NOT EXISTS `hall_type` (
  `hall_type_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(12) NOT NULL,
  PRIMARY KEY (`hall_type_id`)
) ENGINE = InnoDB;

-- Таблица: hall
CREATE TABLE IF NOT EXISTS `hall` (
  `hall_id` INT NOT NULL AUTO_INCREMENT,
  `cinema_id` INT NOT NULL,
  `hall_type_id` INT NOT NULL,
  `seats` TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (`hall_id`),
  INDEX `cinema_id_idx` (`cinema_id` ASC) VISIBLE,
  INDEX `hall_type_id_idx` (`hall_type_id` ASC) VISIBLE,
  CONSTRAINT `fk_hall_cinema`
    FOREIGN KEY (`cinema_id`) REFERENCES `cinema` (`cinema_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hall_type`
    FOREIGN KEY (`hall_type_id`) REFERENCES `hall_type` (`hall_type_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Таблица: director
CREATE TABLE IF NOT EXISTS `director` (
  `director_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`director_id`)
) ENGINE = InnoDB;

-- Таблица: film
CREATE TABLE IF NOT EXISTS `film` (
  `film_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(40) NOT NULL,
  `year` YEAR NOT NULL,
  `director_id` INT NOT NULL,
  `duration` TINYINT NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`film_id`),
  INDEX `director_id_idx` (`director_id` ASC) VISIBLE,
  CONSTRAINT `fk_film_director`
    FOREIGN KEY (`director_id`) REFERENCES `director` (`director_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Таблица: genre
CREATE TABLE IF NOT EXISTS `genre` (
  `genre_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`genre_id`)
) ENGINE = InnoDB;

-- Таблица: film_genre
CREATE TABLE IF NOT EXISTS `film_genre` (
  `genre_id` INT NOT NULL,
  `film_id` INT NOT NULL,
  INDEX `genre_id_idx` (`genre_id` ASC) VISIBLE,
  INDEX `film_id_idx` (`film_id` ASC) VISIBLE,
  CONSTRAINT `fk_fg_genre`
    FOREIGN KEY (`genre_id`) REFERENCES `genre` (`genre_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fg_film`
    FOREIGN KEY (`film_id`) REFERENCES `film` (`film_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Таблица: cashier
CREATE TABLE IF NOT EXISTS `cashier` (
  `cashier_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `phone` VARCHAR(11) NOT NULL,
  PRIMARY KEY (`cashier_id`)
) ENGINE = InnoDB;

-- Таблица: session
CREATE TABLE IF NOT EXISTS `session` (
  `session_id` INT NOT NULL AUTO_INCREMENT,
  `film_id` INT NOT NULL,
  `hall_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `s_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('planned', 'started', 'completed', 'canceled') NOT NULL DEFAULT 'planned',
  `cashier_id` INT NULL,
  `price` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`session_id`),
  INDEX `film_id_idx` (`film_id` ASC) VISIBLE,
  INDEX `hall_id_idx` (`hall_id` ASC) VISIBLE,
  INDEX `cashier_id_idx` (`cashier_id` ASC) VISIBLE,
  CONSTRAINT `fk_session_film`
    FOREIGN KEY (`film_id`) REFERENCES `film` (`film_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_session_hall`
    FOREIGN KEY (`hall_id`) REFERENCES `hall` (`hall_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_session_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `cashier` (`cashier_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Таблица: client
CREATE TABLE IF NOT EXISTS `client` (
  `client_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `phone` VARCHAR(11) NOT NULL,
  `email` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`client_id`)
) ENGINE = InnoDB;

-- Таблица: ticket
CREATE TABLE IF NOT EXISTS `ticket` (
  `ticket_id` INT NOT NULL AUTO_INCREMENT,
  `session_id` INT NOT NULL,
  `seat` TINYINT UNSIGNED NOT NULL,
  `status` ENUM('reserved', 'paid', 'used', 'refunded') NOT NULL DEFAULT 'reserved',
  `date` DATETIME NOT NULL,
  `client_id` INT NOT NULL,
  `cashier_id` INT NULL,
  `payment_id` INT NULL,
  PRIMARY KEY (`ticket_id`),
  INDEX `session_id_idx` (`session_id` ASC) VISIBLE,
  INDEX `client_id_idx` (`client_id` ASC) VISIBLE,
  CONSTRAINT `fk_ticket_session`
    FOREIGN KEY (`session_id`) REFERENCES `session` (`session_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_client`
    FOREIGN KEY (`client_id`) REFERENCES `client` (`client_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `cashier` (`cashier_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

-- Таблица: payment
CREATE TABLE IF NOT EXISTS `payment` (
  `payment_id` INT NOT NULL AUTO_INCREMENT,
  `amount` DECIMAL(7,2) NOT NULL,
  `date` DATETIME NOT NULL,
  `status` ENUM('paid', 'refunded') NOT NULL,
  PRIMARY KEY (`payment_id`)
) ENGINE = InnoDB;

-- Связь билета с платежом
ALTER TABLE `ticket`
  ADD CONSTRAINT `fk_ticket_payment`
  FOREIGN KEY (`payment_id`) REFERENCES `payment` (`payment_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
