CREATE TABLE team_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addressee_email VARCHAR(320) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT team_connections_status_check
        CHECK (status IN ('pending', 'accepted', 'rejected', 'pending_registration')),
    CONSTRAINT team_connections_target_check
        CHECK ((status = 'pending_registration' AND addressee_id IS NULL)
            OR (status <> 'pending_registration' AND addressee_id IS NOT NULL)),
    CONSTRAINT team_connections_not_self_check
        CHECK (addressee_id IS NULL OR requester_id <> addressee_id)
);

CREATE UNIQUE INDEX team_connections_active_pair_idx
    ON team_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
    WHERE addressee_id IS NOT NULL AND status IN ('pending', 'accepted');

CREATE UNIQUE INDEX team_connections_requester_email_idx
    ON team_connections (requester_id, lower(addressee_email))
    WHERE status IN ('pending', 'pending_registration', 'accepted');

CREATE INDEX team_connections_received_pending_idx
    ON team_connections (addressee_id, requested_at DESC)
    WHERE status = 'pending';

CREATE INDEX team_connections_sent_pending_idx
    ON team_connections (requester_id, requested_at DESC)
    WHERE status IN ('pending', 'pending_registration');

CREATE INDEX team_connections_pending_registration_email_idx
    ON team_connections (lower(addressee_email))
    WHERE status = 'pending_registration';

CREATE INDEX team_connections_members_requester_idx
    ON team_connections (requester_id, responded_at DESC)
    WHERE status = 'accepted';

CREATE INDEX team_connections_members_addressee_idx
    ON team_connections (addressee_id, responded_at DESC)
    WHERE status = 'accepted';
