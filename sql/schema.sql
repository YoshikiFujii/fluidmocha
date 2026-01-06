-- Create tables

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    redirect_page VARCHAR(255) DEFAULT 'dashboard.html',
    assigned_gender VARCHAR(10) DEFAULT NULL,
    assigned_floor VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rosters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Config table to store mapping of columns for each roster upload
CREATE TABLE IF NOT EXISTS roster_config (
    roster_id INT PRIMARY KEY,
    col_room VARCHAR(5),
    col_floor VARCHAR(5),
    col_gender VARCHAR(5),
    col_category VARCHAR(5),
    col_name VARCHAR(5),
    col_kana VARCHAR(5),
    col_hometown VARCHAR(5),
    col_student_num VARCHAR(5),
    col_department VARCHAR(5),
    FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roster_id INT NOT NULL,
    internal_id VARCHAR(36) NOT NULL UNIQUE, -- Random ID
    room VARCHAR(20),
    floor VARCHAR(10),
    gender VARCHAR(10),
    category VARCHAR(20),
    name VARCHAR(100),
    kana VARCHAR(100),
    hometown VARCHAR(100),
    student_num VARCHAR(20),
    department VARCHAR(100),
    FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roster_id INT NOT NULL,
    preset VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roster_id) REFERENCES rosters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    student_internal_id VARCHAR(36) NOT NULL,
    status VARCHAR(50) DEFAULT 'unconfirmed',
    note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (event_id, student_internal_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_internal_id) REFERENCES students(internal_id) ON DELETE CASCADE
);

-- Insert default admin users
-- Password hash: 'password' -> '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2'

INSERT IGNORE INTO admins (username, password_hash, redirect_page) VALUES ('admin', '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2', 'dashboard.html');
INSERT IGNORE INTO admins (username, password_hash, redirect_page) VALUES ('entrance', '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2', 'entrance.html');
INSERT IGNORE INTO admins (username, password_hash, redirect_page) VALUES ('reception', '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2', 'reception.html');
INSERT IGNORE INTO admins (username, password_hash, redirect_page) VALUES ('souhou', '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2', 'reception-souhou.html');
INSERT IGNORE INTO admins (username, password_hash, redirect_page) VALUES ('tsubaki', '$2y$10$SwQUXopjIu8C60QE42vhUe8ljEQ20hsHBlocDp75WaoEqVREWuUq2', 'reception-tsubaki.html');
