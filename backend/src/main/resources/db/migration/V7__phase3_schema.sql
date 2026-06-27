-- Add new configuration columns for Phase 3 features
ALTER TABLE form_configs ADD COLUMN logic_json TEXT DEFAULT '[]';
ALTER TABLE form_configs ADD COLUMN theme_json TEXT DEFAULT '{}';
ALTER TABLE form_configs ADD COLUMN sharing_json TEXT DEFAULT '{}';

-- Create table for tracking form views (analytics)
CREATE TABLE form_views (
    id BIGSERIAL PRIMARY KEY,
    form_id BIGINT NOT NULL,
    user_agent TEXT,
    browser VARCHAR(255),
    os VARCHAR(255),
    device_type VARCHAR(255),
    country VARCHAR(255),
    city VARCHAR(255),
    referer VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add analytics columns to submissions table
ALTER TABLE submissions ADD COLUMN browser VARCHAR(255);
ALTER TABLE submissions ADD COLUMN os VARCHAR(255);
ALTER TABLE submissions ADD COLUMN device_type VARCHAR(255);
ALTER TABLE submissions ADD COLUMN country VARCHAR(255);
ALTER TABLE submissions ADD COLUMN city VARCHAR(255);
ALTER TABLE submissions ADD COLUMN referer VARCHAR(255);
ALTER TABLE submissions ADD COLUMN completion_time_seconds INTEGER DEFAULT 0;

-- Create table for form templates
CREATE TABLE templates (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255) NOT NULL,
    questions_json TEXT NOT NULL,
    settings_json TEXT DEFAULT '{}',
    logic_json TEXT DEFAULT '[]',
    theme_json TEXT DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed Initial Professional Templates
INSERT INTO templates (title, description, category, questions_json, settings_json, logic_json, theme_json) VALUES
('Hackathon Registration Form', 'Gather registrations, team preferences, and project ideas for your next hackathon.', 'Hackathons',
 '[{"id":"q_name","title":"Full Name","type":"short-answer","required":true,"helpText":"Enter your full name","placeholder":"John Doe","fieldKey":"fullName"},
   {"id":"q_email","title":"Email Address","type":"email","required":true,"helpText":"We will use this to send event details","placeholder":"john@example.com","fieldKey":"email"},
   {"id":"q_experience","title":"Coding Experience","type":"multiple-choice","required":true,"options":["Beginner","Intermediate","Advanced","Elite Code Wizard"],"helpText":"Help us balance the teams"},
   {"id":"q_team","title":"Team Preference","type":"multiple-choice","required":true,"options":["I already have a team","I want to be matched with a team","I want to work solo"],"helpText":"Choose your team configuration"},
   {"id":"q_project","title":"Project Proposal / Idea","type":"paragraph","required":false,"placeholder":"Brief description of what you plan to build...","helpText":"Optional"}]',
 '{"allowEdit":false,"allowMultiple":false,"showThankYou":true,"successMessage":"Congratulations! You are registered for the hackathon. See you there!","thankYouTitle":"Registration Confirmed","thankYouDescription":"Your spot is reserved. Watch your inbox for schedule details.","successIllustration":"🎉"}',
 '[]',
 '{"theme":"cyberpunk","accent":"#facc15","fontFamily":"Orbitron","borderRadius":"8px","density":"comfortable"}'),

('Customer Support Ticket', 'Allow customers to log technical issues and feedback.', 'Customer Support',
 '[{"id":"q_cust_name","title":"Your Name","type":"short-answer","required":true,"fieldKey":"fullName"},
   {"id":"q_cust_email","title":"Your Email","type":"email","required":true,"fieldKey":"email"},
   {"id":"q_category","title":"Support Category","type":"dropdown","required":true,"options":["Billing","Bug Report","Feature Request","Account Access"]},
   {"id":"q_subject","title":"Ticket Subject","type":"short-answer","required":true,"placeholder":"Summarize the issue"},
   {"id":"q_details","title":"Detailed Description","type":"paragraph","required":true,"placeholder":"Provide step-by-step details of the issue..."}]',
 '{"allowEdit":false,"allowMultiple":true,"showThankYou":true,"successMessage":"Ticket submitted successfully. Our support team will get back to you shortly.","thankYouTitle":"Ticket Created","thankYouDescription":"We have received your ticket and are investigating.","successIllustration":"🛡️"}',
 '[]',
 '{"theme":"silver","accent":"#cbd5e1","fontFamily":"Outfit","borderRadius":"12px","density":"comfortable"}'),

('Cyberpunk Trivia Quiz', 'Test participants knowledge of retro-futurism and cyberpunk lore.', 'Quiz',
 '[{"id":"q_quiz_name","title":"Name","type":"short-answer","required":true,"fieldKey":"fullName"},
   {"id":"q_quiz_email","title":"Email","type":"email","required":true,"fieldKey":"email"},
   {"id":"q_trivia1","title":"What does "Neuromancer" refer to in William Gibsons novel?","type":"multiple-choice","required":true,"options":["A supercomputer AI","A cybernetic enhancement","A street drug","A virtual reality deck"]},
   {"id":"q_trivia2","title":"In Blade Runner, what is the test used to determine if a subject is a replicant?","type":"multiple-choice","required":true,"options":["Voight-Kampff test","Turing evaluation","Deckard baseline","Replicant filter"]},
   {"id":"q_rating","title":"How would you rate this trivia difficulty?","type":"star-rating","required":false,"scaleMax":5,"fieldKey":"rating"}]',
 '{"allowEdit":false,"allowMultiple":false,"showThankYou":true,"successMessage":"Trivia completed! Your neural scores are being calibrated.","thankYouTitle":"Scores Synced","thankYouDescription":"Neural uplink complete. Responses stored in memory banks.","successIllustration":"🧠"}',
 '[]',
 '{"theme":"cyberpunk","accent":"#facc15","fontFamily":"Share Tech Mono","borderRadius":"4px","density":"comfortable"}');
