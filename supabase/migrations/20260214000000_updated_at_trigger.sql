-- ============================================
-- Reusable updated_at Trigger Function
-- ============================================
-- Auto-updates the updated_at column on any row modification.
-- Apply this trigger to any table with an updated_at column.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
