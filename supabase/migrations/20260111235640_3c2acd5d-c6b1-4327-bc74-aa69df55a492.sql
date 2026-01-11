-- ============================================================
-- MIGRAÇÃO PDV ANÁFOOD V3.1+V3.2 CONSOLIDADO
-- Sistema de Frente de Caixa Completo
-- Data: 2026-01-11
-- ============================================================

-- ============================================================
-- PARTE 1: SEQUÊNCIA ATÔMICA PARA CHECK_NUMBER
-- ============================================================

CREATE TABLE IF NOT EXISTS check_sequences (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    last_number INT DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    reset_daily BOOLEAN DEFAULT false
);

-- Função com lock atômico para evitar race condition
CREATE OR REPLACE FUNCTION get_next_check_number(p_company_id UUID)
RETURNS INT AS $$
DECLARE
    v_number INT;
BEGIN
    INSERT INTO check_sequences (company_id, last_number, last_reset_date)
    VALUES (p_company_id, 0, CURRENT_DATE)
    ON CONFLICT (company_id) DO NOTHING;
    
    UPDATE check_sequences
    SET 
        last_number = CASE 
            WHEN reset_daily AND last_reset_date < CURRENT_DATE THEN 1
            ELSE last_number + 1
        END,
        last_reset_date = CURRENT_DATE
    WHERE company_id = p_company_id
    RETURNING last_number INTO v_number;
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PARTE 2: CONFIGURAÇÕES DO PDV
-- ============================================================

CREATE TABLE IF NOT EXISTS pdv_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Ociosidade de mesa (cores de alerta)
    idle_alert_minutes_1 INT DEFAULT 15,
    idle_alert_minutes_2 INT DEFAULT 30,
    idle_alert_minutes_3 INT DEFAULT 45,
    idle_color_1 VARCHAR(7) DEFAULT '#FFC107',
    idle_color_2 VARCHAR(7) DEFAULT '#FF9800',
    idle_color_3 VARCHAR(7) DEFAULT '#F44336',
    
    -- Taxa de serviço
    default_service_percent DECIMAL(5,2) DEFAULT 10,
    service_optional BOOLEAN DEFAULT true,
    service_on_subtotal BOOLEAN DEFAULT true,
    
    -- Couvert
    couvert_enabled BOOLEAN DEFAULT false,
    couvert_price DECIMAL(12,2) DEFAULT 0,
    couvert_description VARCHAR(100) DEFAULT 'Couvert Artístico',
    
    -- Atalhos de cédulas
    cash_shortcuts_enabled BOOLEAN DEFAULT true,
    cash_shortcuts JSONB DEFAULT '[2, 5, 10, 20, 50, 100, 200]',
    
    -- Vendas em espera
    pending_sales_enabled BOOLEAN DEFAULT true,
    pending_sales_expire_hours INT DEFAULT 24,
    
    -- Controles
    require_open_register BOOLEAN DEFAULT true,
    require_waiter_on_table BOOLEAN DEFAULT false,
    auto_print_on_send BOOLEAN DEFAULT true,
    allow_negative_stock BOOLEAN DEFAULT false,
    
    -- Limites
    max_discount_percent DECIMAL(5,2) DEFAULT 10,
    withdrawal_limit DECIMAL(12,2) DEFAULT 200,
    
    -- NFC-e (preparado para V2)
    nfce_enabled BOOLEAN DEFAULT false,
    nfce_default_emit BOOLEAN DEFAULT false,
    
    -- Impressão
    receipt_header TEXT,
    receipt_footer TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id)
);

-- ============================================================
-- PARTE 3: GARÇONS COM INTEGRIDADE REFERENCIAL
-- ============================================================

CREATE TABLE IF NOT EXISTS table_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    assigned_area_id UUID REFERENCES table_areas(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_waiters_company_active ON waiters(company_id, is_active);

-- ============================================================
-- PARTE 4: PROMOÇÕES E HAPPY HOUR (SEPARADO DE COUPONS)
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('happy_hour', 'weekday', 'date_range', 'always')),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'new_price')),
    discount_value DECIMAL(12,2) NOT NULL,
    applies_to VARCHAR(20) DEFAULT 'selected' CHECK (applies_to IN ('all', 'category', 'selected')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    apply_to_table BOOLEAN DEFAULT true,
    apply_to_counter BOOLEAN DEFAULT true,
    apply_to_delivery BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    days_of_week INT[] DEFAULT '{0,1,2,3,4,5,6}',
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    special_price DECIMAL(12,2),
    UNIQUE(promotion_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_promotions_company_active ON promotions(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(company_id, start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_active_now ON promotions(company_id, start_time, end_time, days_of_week) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotion_products_product ON promotion_products(product_id);

-- ============================================================
-- PARTE 5: CONTROLE DE CAIXA
-- ============================================================

CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    terminal_name VARCHAR(50) DEFAULT 'Caixa 01',
    operator_id UUID NOT NULL,
    operator_name VARCHAR(100),
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(12,2),
    expected_amount DECIMAL(12,2),
    difference DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    opening_notes TEXT,
    closing_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('opening', 'supply', 'withdrawal', 'closing')),
    amount DECIMAL(12,2) NOT NULL,
    reason VARCHAR(200),
    authorized_by UUID,
    authorized_by_name VARCHAR(100),
    created_by UUID NOT NULL,
    created_by_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_company_status ON cash_registers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements(cash_register_id);

-- ============================================================
-- PARTE 6: MESAS
-- ============================================================

CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    area_id UUID REFERENCES table_areas(id) ON DELETE SET NULL,
    table_number VARCHAR(20) NOT NULL,
    name VARCHAR(50),
    capacity INT DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'blocked', 'cleaning')),
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 100,
    height INT DEFAULT 100,
    shape VARCHAR(20) DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rectangle')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_company_status ON tables(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tables_area ON tables(area_id);
CREATE INDEX IF NOT EXISTS idx_table_areas_company ON table_areas(company_id, is_active);

-- ============================================================
-- PARTE 7: COMANDAS (CHECKS) - 42 CAMPOS
-- ============================================================

CREATE TABLE IF NOT EXISTS checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    check_number INT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'counter' CHECK (type IN ('table', 'counter', 'delivery', 'takeout')),
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cash_register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES waiters(id) ON DELETE SET NULL,
    waiter_name VARCHAR(100),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    guest_count INT DEFAULT 1,
    address TEXT,
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    address_reference TEXT,
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_reason VARCHAR(200),
    discount_by UUID,
    service_percent DECIMAL(5,2) DEFAULT 10,
    service_amount DECIMAL(12,2) DEFAULT 0,
    couvert_count INT DEFAULT 0,
    couvert_unit_price DECIMAL(12,2) DEFAULT 0,
    couvert_amount DECIMAL(12,2) DEFAULT 0,
    delivery_fee DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    estimated_time INT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'sent', 'printed', 'paying', 'paid', 'closed', 'cancelled')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    last_item_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    opened_by UUID NOT NULL,
    closed_by UUID,
    cancelled_by UUID,
    cancel_reason VARCHAR(200),
    notes TEXT,
    internal_notes TEXT,
    source VARCHAR(20) DEFAULT 'pdv' CHECK (source IN ('pdv', 'whatsapp', 'digital_menu', 'api', 'ifood', 'counter')),
    external_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, check_number),
    CONSTRAINT check_table_required CHECK (type != 'table' OR table_id IS NOT NULL),
    CONSTRAINT check_delivery_address CHECK (type != 'delivery' OR (address IS NOT NULL AND neighborhood IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_checks_company_status ON checks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_checks_company_type ON checks(company_id, type);
CREATE INDEX IF NOT EXISTS idx_checks_table ON checks(table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_customer ON checks(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_register ON checks(cash_register_id) WHERE cash_register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_waiter ON checks(waiter_id) WHERE waiter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_order ON checks(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_opened_at ON checks(company_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_checks_source ON checks(company_id, source);
CREATE INDEX IF NOT EXISTS idx_checks_date_range ON checks(company_id, opened_at DESC, status);

-- ============================================================
-- PARTE 8: ITENS DA COMANDA
-- ============================================================

CREATE TABLE IF NOT EXISTS check_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    check_id UUID NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(50),
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    extras_total DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    extras JSONB DEFAULT '[]'::jsonb,
    promotion_id UUID REFERENCES promotions(id),
    original_price DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'preparing', 'ready', 'delivered', 'cancelled')),
    sent_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancel_reason VARCHAR(200),
    print_location VARCHAR(50) DEFAULT 'cozinha_1',
    printed_at TIMESTAMPTZ,
    print_count INT DEFAULT 0,
    notes TEXT,
    split_from_id UUID REFERENCES check_items(id),
    seat_number INT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_items_check ON check_items(check_id);
CREATE INDEX IF NOT EXISTS idx_check_items_product ON check_items(product_id);
CREATE INDEX IF NOT EXISTS idx_check_items_status ON check_items(check_id, status);
CREATE INDEX IF NOT EXISTS idx_check_items_pending_print ON check_items(company_id, print_location, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_check_items_print_queue ON check_items(company_id, print_location, created_at) WHERE status = 'pending' AND printed_at IS NULL;

-- ============================================================
-- PARTE 9: PAGAMENTOS
-- ============================================================

CREATE TABLE IF NOT EXISTS check_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    check_id UUID NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES cash_registers(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    payment_method_name VARCHAR(50) NOT NULL,
    payment_method_type VARCHAR(20),
    amount DECIMAL(12,2) NOT NULL,
    received_amount DECIMAL(12,2),
    change_amount DECIMAL(12,2) DEFAULT 0,
    tip_amount DECIMAL(12,2) DEFAULT 0,
    nsu VARCHAR(50),
    authorization_code VARCHAR(50),
    transaction_id VARCHAR(100),
    card_brand VARCHAR(30),
    card_last_digits VARCHAR(4),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    processed_by UUID NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancel_reason VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_payments_check ON check_payments(check_id);
CREATE INDEX IF NOT EXISTS idx_check_payments_register ON check_payments(cash_register_id) WHERE cash_register_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_check_payments_period ON check_payments(company_id, processed_at DESC) WHERE status = 'completed';

-- ============================================================
-- PARTE 10: VENDAS EM ESPERA
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reference VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('counter', 'delivery', 'takeout')),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_id UUID REFERENCES customers(id),
    address TEXT,
    neighborhood VARCHAR(100),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_pending_sales_company ON pending_sales(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_sales_phone ON pending_sales(company_id, customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pending_sales_expires ON pending_sales(expires_at);

-- ============================================================
-- PARTE 11: CAMPO TYPE EM PAYMENT_METHODS
-- ============================================================

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'other';

DO $$
BEGIN
    ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_type_check 
    CHECK (type IN ('cash', 'credit', 'debit', 'pix', 'voucher', 'other'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

UPDATE payment_methods SET type = 'cash' WHERE LOWER(name) LIKE '%dinheiro%' AND type = 'other';
UPDATE payment_methods SET type = 'pix' WHERE LOWER(name) LIKE '%pix%' AND type = 'other';
UPDATE payment_methods SET type = 'credit' WHERE (LOWER(name) LIKE '%créd%' OR LOWER(name) LIKE '%cred%') AND type = 'other';
UPDATE payment_methods SET type = 'debit' WHERE (LOWER(name) LIKE '%déb%' OR LOWER(name) LIKE '%deb%') AND type = 'other';
UPDATE payment_methods SET type = 'voucher' WHERE (LOWER(name) LIKE '%vale%' OR LOWER(name) LIKE '%voucher%') AND type = 'other';

-- ============================================================
-- PARTE 12: RLS POLICIES
-- ============================================================

ALTER TABLE pdv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pdv_settings" ON pdv_settings FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_waiters" ON waiters FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_promotions" ON promotions FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_promotion_products" ON promotion_products FOR ALL USING (
    promotion_id IN (SELECT id FROM promotions WHERE company_id = get_user_company_id(auth.uid()))
);
CREATE POLICY "tenant_cash_registers" ON cash_registers FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_cash_movements" ON cash_movements FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_table_areas" ON table_areas FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_tables" ON tables FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_check_sequences" ON check_sequences FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_checks" ON checks FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_check_items" ON check_items FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_check_payments" ON check_payments FOR ALL USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "tenant_pending_sales" ON pending_sales FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- ============================================================
-- PARTE 13: TRIGGERS
-- ============================================================

-- Trigger para gerar check_number
CREATE OR REPLACE FUNCTION trigger_set_check_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.check_number := get_next_check_number(NEW.company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_checks_set_number ON checks;
CREATE TRIGGER trg_checks_set_number
    BEFORE INSERT ON checks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_check_number();

-- Trigger para atualizar last_item_at
CREATE OR REPLACE FUNCTION trigger_update_check_last_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE checks 
    SET last_item_at = NOW(), updated_at = NOW()
    WHERE id = NEW.check_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_items_update_last ON check_items;
CREATE TRIGGER trg_check_items_update_last
    AFTER INSERT ON check_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_check_last_item();

-- Trigger para atualizar totais da comanda
CREATE OR REPLACE FUNCTION trigger_update_check_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_check RECORD;
    v_subtotal DECIMAL(12,2);
    v_service DECIMAL(12,2);
    v_total DECIMAL(12,2);
BEGIN
    SELECT * INTO v_check FROM checks WHERE id = COALESCE(NEW.check_id, OLD.check_id);
    
    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM check_items WHERE check_id = v_check.id AND status != 'cancelled';
    
    v_service := (v_subtotal * v_check.service_percent) / 100;
    v_total := v_subtotal - v_check.discount_amount + v_service + v_check.couvert_amount + v_check.delivery_fee;
    
    UPDATE checks SET
        subtotal = v_subtotal,
        service_amount = v_service,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_check.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_items_update_totals ON check_items;
CREATE TRIGGER trg_check_items_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON check_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_check_totals();

-- Trigger para atualizar status da mesa
CREATE OR REPLACE FUNCTION trigger_update_table_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.table_id IS NOT NULL THEN
        UPDATE tables SET status = 'occupied', updated_at = NOW() WHERE id = NEW.table_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('closed', 'cancelled', 'paid') THEN
        IF NEW.table_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM checks 
                WHERE table_id = NEW.table_id 
                AND status NOT IN ('closed', 'cancelled', 'paid')
                AND id != NEW.id
            ) THEN
                UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = NEW.table_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_checks_update_table ON checks;
CREATE TRIGGER trg_checks_update_table
    AFTER INSERT OR UPDATE ON checks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_table_status();

-- Trigger para atualizar paid_amount
CREATE OR REPLACE FUNCTION trigger_update_check_paid()
RETURNS TRIGGER AS $$
DECLARE
    v_check_id UUID;
    v_total_paid DECIMAL(12,2);
    v_check_total DECIMAL(12,2);
BEGIN
    v_check_id := COALESCE(NEW.check_id, OLD.check_id);
    
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM check_payments WHERE check_id = v_check_id AND status = 'completed';
    
    SELECT total_amount INTO v_check_total FROM checks WHERE id = v_check_id;
    
    UPDATE checks SET
        paid_amount = v_total_paid,
        status = CASE 
            WHEN v_total_paid >= v_check_total AND v_check_total > 0 THEN 'paid'
            WHEN v_total_paid > 0 THEN 'paying'
            ELSE status
        END,
        paid_at = CASE 
            WHEN v_total_paid >= v_check_total AND v_check_total > 0 THEN NOW()
            ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = v_check_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_payments_update_check ON check_payments;
CREATE TRIGGER trg_payments_update_check
    AFTER INSERT OR UPDATE OR DELETE ON check_payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_check_paid();

-- Triggers updated_at para todas as tabelas
DROP TRIGGER IF EXISTS trg_pdv_settings_updated ON pdv_settings;
CREATE TRIGGER trg_pdv_settings_updated BEFORE UPDATE ON pdv_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_waiters_updated ON waiters;
CREATE TRIGGER trg_waiters_updated BEFORE UPDATE ON waiters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotions_updated ON promotions;
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cash_registers_updated ON cash_registers;
CREATE TRIGGER trg_cash_registers_updated BEFORE UPDATE ON cash_registers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_table_areas_updated ON table_areas;
CREATE TRIGGER trg_table_areas_updated BEFORE UPDATE ON table_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tables_updated ON tables;
CREATE TRIGGER trg_tables_updated BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_checks_updated ON checks;
CREATE TRIGGER trg_checks_updated BEFORE UPDATE ON checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_check_items_updated ON check_items;
CREATE TRIGGER trg_check_items_updated BEFORE UPDATE ON check_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pending_sales_updated ON pending_sales;
CREATE TRIGGER trg_pending_sales_updated BEFORE UPDATE ON pending_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PARTE 14: VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_tables_with_checks AS
SELECT 
    t.id,
    t.company_id,
    t.area_id,
    t.table_number,
    t.name,
    t.capacity,
    t.status,
    t.position_x,
    t.position_y,
    t.width,
    t.height,
    t.shape,
    t.is_active,
    ta.name as area_name,
    COALESCE(c.open_checks_count, 0) as open_checks_count,
    COALESCE(c.total_amount, 0) as current_total,
    c.oldest_opened_at,
    c.last_item_at,
    c.waiter_name,
    CASE 
        WHEN c.oldest_opened_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - c.oldest_opened_at))/60 
        ELSE 0 
    END as minutes_occupied,
    CASE 
        WHEN c.last_item_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - c.last_item_at))/60 
        WHEN c.oldest_opened_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (NOW() - c.oldest_opened_at))/60
        ELSE 0 
    END as minutes_idle
FROM tables t
LEFT JOIN table_areas ta ON t.area_id = ta.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as open_checks_count,
        SUM(total_amount) as total_amount,
        MIN(opened_at) as oldest_opened_at,
        MAX(last_item_at) as last_item_at,
        MAX(waiter_name) as waiter_name
    FROM checks
    WHERE checks.table_id = t.id
    AND checks.status NOT IN ('closed', 'cancelled', 'paid')
) c ON true
WHERE t.is_active = true;

GRANT SELECT ON v_tables_with_checks TO authenticated;

CREATE OR REPLACE VIEW v_cash_register_summary AS
SELECT 
    cr.id,
    cr.company_id,
    cr.terminal_name,
    cr.operator_id,
    cr.operator_name,
    cr.opening_amount,
    cr.closing_amount,
    cr.expected_amount,
    cr.difference,
    cr.status,
    cr.opened_at,
    cr.closed_at,
    COALESCE(m.total_supplies, 0) as total_supplies,
    COALESCE(m.total_withdrawals, 0) as total_withdrawals,
    COALESCE(p.cash_total, 0) as cash_sales,
    COALESCE(p.card_total, 0) as card_sales,
    COALESCE(p.pix_total, 0) as pix_sales,
    COALESCE(p.total_sales, 0) as total_sales,
    COALESCE(p.tips_total, 0) as tips_total,
    (cr.opening_amount + COALESCE(m.total_supplies, 0) - COALESCE(m.total_withdrawals, 0) + COALESCE(p.cash_total, 0)) as expected_cash
FROM cash_registers cr
LEFT JOIN LATERAL (
    SELECT 
        SUM(CASE WHEN movement_type = 'supply' THEN amount ELSE 0 END) as total_supplies,
        SUM(CASE WHEN movement_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals
    FROM cash_movements WHERE cash_register_id = cr.id
) m ON true
LEFT JOIN LATERAL (
    SELECT 
        SUM(amount) as total_sales,
        SUM(tip_amount) as tips_total,
        SUM(CASE WHEN payment_method_type = 'cash' THEN amount ELSE 0 END) as cash_total,
        SUM(CASE WHEN payment_method_type IN ('credit', 'debit') THEN amount ELSE 0 END) as card_total,
        SUM(CASE WHEN payment_method_type = 'pix' THEN amount ELSE 0 END) as pix_total
    FROM check_payments WHERE cash_register_id = cr.id AND status = 'completed'
) p ON true;

GRANT SELECT ON v_cash_register_summary TO authenticated;

-- ============================================================
-- PARTE 15: FUNÇÃO DE LIMPEZA
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_pending_sales()
RETURNS TABLE (deleted_count INT, oldest_deleted TIMESTAMPTZ) AS $$
DECLARE
    v_deleted INT;
    v_oldest TIMESTAMPTZ;
BEGIN
    SELECT MIN(created_at) INTO v_oldest FROM pending_sales WHERE expires_at < NOW();
    DELETE FROM pending_sales WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN QUERY SELECT v_deleted, v_oldest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION cleanup_expired_pending_sales() TO service_role;

-- ============================================================
-- PARTE 16: SEED INICIAL
-- ============================================================

INSERT INTO pdv_settings (company_id)
SELECT id FROM companies
WHERE NOT EXISTS (SELECT 1 FROM pdv_settings WHERE pdv_settings.company_id = companies.id)
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO table_areas (company_id, name, sort_order)
SELECT id, 'Salão Principal', 0
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM table_areas WHERE table_areas.company_id = companies.id)
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO check_sequences (company_id, last_number)
SELECT id, 0 FROM companies
ON CONFLICT (company_id) DO NOTHING;