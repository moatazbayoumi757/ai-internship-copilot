CREATE TYPE application_status AS ENUM ('Applied', 'OA', 'Interview', 'Rejected', 'Offer');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_descriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    status application_status NOT NULL DEFAULT 'Applied',
    applied_on DATE NOT NULL,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    job_description_id INTEGER REFERENCES job_descriptions(id) ON DELETE SET NULL,
    match_score INTEGER CHECK (match_score BETWEEN 0 AND 100),
    extracted_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    bullet_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recruiter_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (email, full_name, hashed_password)
VALUES (
    'demo@example.com',
    'Demo Candidate',
    '$2y$12$d80oSkP8QZJhL5WUjGWU9.Icx5ISzydvA40bqhRFM7mg0wFB6tmJi'
);

INSERT INTO applications (user_id, company_name, role_title, status, applied_on, location, notes)
VALUES
    (1, 'OpenAI', 'Software Engineering Intern', 'Applied', CURRENT_DATE - INTERVAL '12 days', 'San Francisco, CA', 'Referral submitted'),
    (1, 'Stripe', 'Backend Engineering Intern', 'OA', CURRENT_DATE - INTERVAL '9 days', 'Remote', 'OA due Friday'),
    (1, 'Figma', 'Product Engineering Intern', 'Interview', CURRENT_DATE - INTERVAL '6 days', 'San Francisco, CA', 'First round scheduled'),
    (1, 'Notion', 'Software Engineering Intern', 'Rejected', CURRENT_DATE - INTERVAL '18 days', 'New York, NY', 'Rejected after resume screen'),
    (1, 'Databricks', 'Software Engineering Intern', 'Offer', CURRENT_DATE - INTERVAL '24 days', 'Mountain View, CA', 'Offer deadline next week');
