-- [H-B02-03] Persiste el dispositivo del cliente en cada backup para que la
-- metadata (BackupMetadata.device) refleje el valor real enviado por el
-- cliente (CreateBackupRequest.device) en vez del hardcode "this-device".
ALTER TABLE backups ADD COLUMN device TEXT NOT NULL DEFAULT 'unknown';
