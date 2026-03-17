-- Seed data for companies
INSERT INTO companies (company_id, company_name, available_shares, total_shares, price_per_share) VALUES
('techstart', 'TechStart Inc', 2450, 2450, 125.00),
('greentech', 'GreenTech Solutions', 1875, 1875, 89.50),
('healthtech', 'HealthTech Innovations', 3200, 3200, 156.75),
('edtech', 'EduTech Platform', 4100, 4100, 67.25)
ON CONFLICT (company_id) DO NOTHING;

-- Seed data for users (admin accounts)
-- Password for all test accounts: password123
INSERT INTO users (name, email, password, role) VALUES
('Zvomunoita Chasakara', 'z.chasakara@gmail.com', '$2y$10$E/MqPKCR0/ERLnUF79oJAuAL1HQafJnj6YfWpW8W9psOlqZ5at9cO', 'admin'),
('Chichi Tad', 'chichi.t@gmail.com', '$2y$10$IPIw/7QkRFmPhtx/xIot..lz9eOQYywzM10Ll.Eo90nZwDG3g4W42', 'user'),
('Teddy Bear', 'teddy.bear@outlook.com', '$2y$10$xWZtwYav2qh3zeWGoP59ve4j5EOj5iS3OMGDr/w.r6Qu1fY400p06', 'admin'),
('Great Wisdom', 'g.wisdom@yahoo.com', '$2y$10$3gPeRp/Zo.S8tH7..y6dsOQLaEf6mM3rEUgH31TkEm46vcJZO3Oja', 'user')
ON CONFLICT (email) DO NOTHING;

-- Seed data for investors
INSERT INTO investors (full_name, address, id_passport, email, password, role, country) VALUES
('Test Investor', '123 Test St', 'TEST123456', 'test@example.com', '$2y$10$E/MqPKCR0/ERLnUF79oJAuAL1HQafJnj6YfWpW8W9psOlqZ5at9cO', 'investor', 'United States'),
('Add Sub Div', '123 Business Avenue, Harare', '09-7000123A80', 'krmakurumidze@gmail.com', '$2y$10$kLTiFoFpGiwcfYcvXdB0wuyxpnGlCHUGd5aN5LJbftSLRvzF0ag8a', 'user', 'Zimbabwe'),
('Frontline State', '123 Liberation Avenue, New City', '12QW134J12', 'frontline.state@frontlinehome.org', '$2y$10$0A/L35xqY9tWof3vWG767.WEvS3Xg.fkSCeGlIzTgJGOxcx0GW.2G', 'investor', 'Algeria'),
('Sam Tad', '112 Big Bro Road, Harare', 'QW123VC1245', 'sam.tad@gmail.com', '$2y$10$UCnTxeRhUVBepIMwjNwQsupzPgr0yWa8k64zdPQt9VSVEXXsof6n6', 'investor', 'Belarus'),
('Online Platform', '100 Beginning Avenue, Paradise, Harare', 'LM007865P', 'online.platform@cool.org', '$2y$10$Cpfab1EOUuiNaG4k9ohHUOvYJS8rc1Srz0Nd85uaucqo7Jrv/G9Cu', 'investor', 'Zimbabwe')
ON CONFLICT (id_passport, email) DO NOTHING;

-- Seed data for portfolio (sample transactions for Test Investor)
INSERT INTO portfolio (user_id, transaction_id, company_name, company_id, shares_purchased, price_per_share, purchase_date, payment_method, status) VALUES
(1, 'TXN-001-2024-001', 'TechStart Inc', 'techstart', 100, 125.00, '2024-01-15 08:30:00', 'Credit Card', 'completed'),
(1, 'TXN-001-2024-002', 'GreenTech Solutions', 'greentech', 50, 89.50, '2024-01-20 12:45:00', 'Credit Card', 'completed'),
(1, 'TXN-001-2024-003', 'HealthTech Innovations', 'healthtech', 75, 156.75, '2024-02-05 07:15:00', 'Credit Card', 'completed')
ON CONFLICT (transaction_id) DO NOTHING;
