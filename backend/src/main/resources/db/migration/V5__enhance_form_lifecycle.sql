ALTER TABLE form_configs ADD COLUMN visibility VARCHAR(255) DEFAULT 'PUBLIC';
ALTER TABLE form_configs ADD COLUMN auto_close_duration VARCHAR(255);
ALTER TABLE form_configs ADD COLUMN business_hours_json TEXT;
ALTER TABLE form_configs ADD COLUMN status_pages_json TEXT;
