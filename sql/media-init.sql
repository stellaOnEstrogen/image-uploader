CREATE TABLE IF NOT EXISTS Media (
    Id VARCHAR(255) PRIMARY KEY,
    Caption TEXT,
    FileName VARCHAR(255),
    ContentType VARCHAR(100),
    Views INT,
    UploadedAt DATETIME,
    UploadedBy TEXT
);
