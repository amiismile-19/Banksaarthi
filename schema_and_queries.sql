-- ====================================================================
-- BankSaarthi PostgreSQL Database Queries
-- Target Database: sih_db
-- Connection: postgresql://postgres:amiismile719@localhost:5432/sih_db
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SEED / ENSURE USER EXISTS
-- --------------------------------------------------------------------
INSERT INTO users (id, name, phone, email, hashed_password, preferred_language)
VALUES (
    1, 
    'Ramesh Kumar', 
    '9876543210', 
    'ramesh.kumar@example.com', 
    '$2b$12$e80yVv8P1s7PZ3M98h07Ce5uP18L7lZ2.mXG.8yG0pQ0E7Ew3pQ0y', 
    'Hindi'
)
ON CONFLICT (phone) DO UPDATE 
SET name = EXCLUDED.name, email = EXCLUDED.email
RETURNING id, name, phone;


-- ====================================================================
-- 2. SQL INSERT QUERIES FOR ALL 6 BANKING FORMS
-- ====================================================================

-- --------------------------------------------------------------------
-- FORM 1: Account Opening Form (Form Type ID = 1)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    1,
    'submitted',
    '{
        "accountType": "Savings",
        "accountMode": "Single",
        "name": "Ramesh Kumar",
        "gender": "Male",
        "fatherOrMotherName": "Suresh Kumar",
        "dob": "1985-08-15",
        "nationality": "Indian",
        "maritalStatus": "Married",
        "mobile": "9876543210",
        "email": "ramesh.kumar@example.com",
        "address": "House No 12, Shivaji Nagar, Kothrud",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "occupation": "Salaried",
        "annualIncome": "1-5L",
        "sourceFunds": "Salary",
        "nomineeName": "Sunita Kumar",
        "nomineeRel": "Spouse",
        "pan": "ABCDE1234F",
        "aadhaar": "XXXX XXXX 3456"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- --------------------------------------------------------------------
-- FORM 2: KYC Updation Form (Form Type ID = 2)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    2,
    'submitted',
    '{
        "name": "Ramesh Kumar",
        "dob": "1985-08-15",
        "gender": "Male",
        "maritalStatus": "Married",
        "fatherOrMotherName": "Suresh Kumar",
        "nationality": "Indian",
        "occupationType": "Service",
        "monthlyIncome": "25000",
        "placeOfBirth": "Pune",
        "panNumber": "ABCDE1234F",
        "mobile": "9876543210",
        "email": "ramesh.kumar@example.com",
        "idProofType": "Aadhaar Card",
        "idNumber": "XXXX XXXX 3456",
        "address": "House No 12, Shivaji Nagar",
        "city": "Pune",
        "district": "Pune",
        "state": "Maharashtra",
        "pincode": "411038",
        "accountNo": "12345678901",
        "branch": "SBI Kothrud"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- --------------------------------------------------------------------
-- FORM 3: Cash Deposit Slip (Form Type ID = 3)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    3,
    'submitted',
    '{
        "branch": "SBI Kothrud",
        "depositAcType": "SB",
        "accountNo": "12345678901",
        "name": "Ramesh Kumar",
        "mobile": "9876543210",
        "depositMode": "Cash",
        "amount": "55000",
        "pan": "ABCDE1234F",
        "cash2000": "0",
        "cash1000": "0",
        "cash500": "110",
        "cash100": "0",
        "cash50": "0",
        "cash20": "0",
        "cash10": "0",
        "cash5": "0",
        "coins": "0"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- --------------------------------------------------------------------
-- FORM 4: Cash Withdrawal Slip (Form Type ID = 4)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    4,
    'submitted',
    '{
        "accountNo": "12345678901",
        "name": "Ramesh Kumar",
        "mobile": "9876543210",
        "withdrawalMethod": "With Passbook",
        "amount": "5000",
        "pan": "ABCDE1234F",
        "homeBranch": "SBI Kothrud",
        "ovdType": "Aadhaar",
        "ovdNumber": "XXXX XXXX 3456",
        "cash2000": "0",
        "cash500": "10",
        "cash100": "0",
        "cash50": "0",
        "cash20": "0",
        "cash10": "0",
        "cash5": "0"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- --------------------------------------------------------------------
-- FORM 5: Mobile Banking Activation (Form Type ID = 6)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    6,
    'submitted',
    '{
        "name": "Ramesh Kumar",
        "accountNo": "12345678901",
        "mobile": "9876543210",
        "email": "ramesh.kumar@example.com",
        "pan": "ABCDE1234F",
        "ifsc": "SBIN0001234",
        "branch": "SBI Kothrud"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- --------------------------------------------------------------------
-- FORM 6: Form 15G / 15H Tax Exemption (Form Type ID = 7)
-- --------------------------------------------------------------------
INSERT INTO forms (user_id, form_type_id, status, form_data)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    7,
    'submitted',
    '{
        "name": "Ramesh Kumar",
        "pan": "ABCDE1234F",
        "accountNo": "12345678901",
        "mobile": "9876543210",
        "dob": "1985-08-15",
        "financialYear": "2025-26",
        "interestIncome": "15000",
        "totalIncome": "250000"
    }'::jsonb
)
RETURNING id, form_type_id, status, created_at;


-- ====================================================================
-- 3. LINKING VOICE INPUT TRANSCRIPTIONS TO A FORM
-- ====================================================================
INSERT INTO voice_inputs (user_id, form_id, audio_file_path, transcribed_text, detected_language, confidence_score)
VALUES (
    (SELECT id FROM users WHERE phone = '9876543210' LIMIT 1),
    (SELECT MAX(id) FROM forms WHERE form_type_id = 1),
    'uploads/recording_audio_sample.webm',
    'बचत खाता खोलना है',
    'hi',
    0.98
);


-- ====================================================================
-- 4. POWERFUL JSONB QUERY EXAMPLES
-- ====================================================================

-- 1. Retrieve all forms with customer details and form type name
SELECT 
    f.id AS form_id,
    t.form_name,
    f.status,
    f.form_data->>'name' AS customer_name,
    f.form_data->>'mobile' AS mobile,
    f.created_at
FROM forms f
JOIN form_types t ON f.form_type_id = t.id
ORDER BY f.created_at DESC;

-- 2. Query forms where Account Type is 'Savings'
SELECT 
    f.id,
    f.form_data->>'name' AS customer_name,
    f.form_data->>'accountType' AS account_type,
    f.form_data->>'address' AS address,
    f.created_at
FROM forms f
WHERE f.form_data->>'accountType' = 'Savings';

-- 3. Query Cash Deposits >= ₹50,000 (PAN required threshold)
SELECT 
    f.id,
    f.form_data->>'name' AS customer_name,
    f.form_data->>'accountNo' AS account_no,
    (f.form_data->>'amount')::numeric AS deposit_amount,
    f.form_data->>'pan' AS pan_number
FROM forms f
WHERE f.form_type_id = 3
  AND (f.form_data->>'amount')::numeric >= 50000;

-- 4. Search any form by PAN number across all forms
SELECT 
    f.id,
    t.form_name,
    COALESCE(f.form_data->>'pan', f.form_data->>'panNumber') AS pan,
    f.form_data->>'name' AS applicant_name,
    f.status,
    f.created_at
FROM forms f
JOIN form_types t ON f.form_type_id = t.id
WHERE f.form_data->>'pan' = 'ABCDE1234F' 
   OR f.form_data->>'panNumber' = 'ABCDE1234F';
