ALTER TABLE form_configs ADD COLUMN publish_state VARCHAR(255) DEFAULT 'DRAFT';
ALTER TABLE form_configs ADD COLUMN manual_state VARCHAR(255) DEFAULT 'NORMAL';
ALTER TABLE form_configs ADD COLUMN published_by VARCHAR(255);
ALTER TABLE form_configs ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE form_configs ADD COLUMN archived_by VARCHAR(255);
ALTER TABLE form_configs ADD COLUMN last_updated TIMESTAMP;
ALTER TABLE form_configs ADD COLUMN last_lifecycle_change TIMESTAMP;
ALTER TABLE form_configs ADD COLUMN last_lifecycle_user VARCHAR(255);

-- Initialize new state columns from legacy properties
UPDATE form_configs SET publish_state = 'ARCHIVED' WHERE status = 'ARCHIVED';
UPDATE form_configs SET publish_state = 'PUBLISHED' WHERE published = TRUE AND status <> 'ARCHIVED';
UPDATE form_configs SET publish_state = 'DRAFT' WHERE published = FALSE AND status <> 'ARCHIVED';

UPDATE form_configs SET manual_state = 'PAUSED' WHERE status = 'PAUSED';
UPDATE form_configs SET manual_state = 'MAINTENANCE' WHERE status = 'MAINTENANCE';
