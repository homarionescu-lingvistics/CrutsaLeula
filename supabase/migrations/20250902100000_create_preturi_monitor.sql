CREATE TABLE IF NOT EXISTS preturi_monitor (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    product_name TEXT,
    store_id BIGINT,
    store_name TEXT,
    network_name TEXT,
    address TEXT,
    price NUMERIC(12, 2) NOT NULL,
    uat_id INTEGER NOT NULL DEFAULT 179132,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT preturi_monitor_product_store_unique UNIQUE (product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_preturi_monitor_product_id ON preturi_monitor (product_id);
CREATE INDEX IF NOT EXISTS idx_preturi_monitor_store_id ON preturi_monitor (store_id);
CREATE INDEX IF NOT EXISTS idx_preturi_monitor_network_name ON preturi_monitor (network_name);
CREATE INDEX IF NOT EXISTS idx_preturi_monitor_uat_id ON preturi_monitor (uat_id);
CREATE INDEX IF NOT EXISTS idx_preturi_monitor_fetched_at ON preturi_monitor (fetched_at DESC);

CREATE OR REPLACE FUNCTION update_preturi_monitor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_preturi_monitor_updated_at ON preturi_monitor;
CREATE TRIGGER trg_preturi_monitor_updated_at
    BEFORE UPDATE ON preturi_monitor
    FOR EACH ROW
    EXECUTE FUNCTION update_preturi_monitor_updated_at();
