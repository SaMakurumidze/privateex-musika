-- Create tables for privateex database in Postgres
-- Converted from MySQL to Postgres

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  available_shares INTEGER NOT NULL DEFAULT 0,
  total_shares INTEGER NOT NULL DEFAULT 0,
  price_per_share DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for admins)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investors table
CREATE TABLE IF NOT EXISTS investors (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  id_passport VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_investor UNIQUE (id_passport, email)
);

-- Portfolio table
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  transaction_id VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_id VARCHAR(50) NOT NULL,
  shares_purchased INTEGER NOT NULL,
  price_per_share DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) DEFAULT 'Credit Card',
  status VARCHAR(20) DEFAULT 'completed',
  billing_fullname VARCHAR(255),
  billing_email VARCHAR(255),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_country VARCHAR(100),
  billing_zip VARCHAR(20),
  card_name VARCHAR(255),
  CONSTRAINT fk_investor FOREIGN KEY (user_id) REFERENCES investors(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transaction_id ON portfolio(transaction_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_purchase_date ON portfolio(purchase_date);

-- Create trigger for updated_at in companies table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
