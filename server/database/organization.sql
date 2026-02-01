-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS perfomix;

-- Use the database
USE perfomix;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  Registeration_id VARCHAR(255) PRIMARY KEY,
  Organization_name VARCHAR(255) NOT NULL,
  Business_email_address VARCHAR(255) NOT NULL,
  Industry_type ENUM(
    'Information Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Telecommunications',
    'Construction',
    'Government',
    'Other'
  ) DEFAULT 'Other',
  Company_size ENUM('Small', 'Medium', 'Large') DEFAULT 'Small',
  description TEXT,
  Headquarters_location TEXT,
  Website_URL VARCHAR(255),
  Establishment_year INT,
  Operating_in_countries VARCHAR(255),
  Logo VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_org_email ON organizations(Business_email_address);
CREATE INDEX idx_org_name ON organizations(Organization_name); 