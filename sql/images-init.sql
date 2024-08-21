CREATE TABLE IF NOT EXISTS Images (
    Id VARCHAR(255) PRIMARY KEY,
    Caption TEXT,
    FileName VARCHAR(255),
    ContentType VARCHAR(100),
    Views INT,
    UploadedAt DATETIME,
    UploadedBy TEXT
);
