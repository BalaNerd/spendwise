-- Settlements Feature Migration
-- Personal money tracker between people

-- ============================================
-- SETTLEMENTS TABLE
-- ============================================

CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gave', 'received')),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTLEMENT PAYMENTS TABLE
-- ============================================

CREATE TABLE public.settlement_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_settlements_user ON public.settlements(user_id, created_at DESC);
CREATE INDEX idx_settlements_user_type ON public.settlements(user_id, type);
CREATE INDEX idx_settlement_payments_settlement ON public.settlement_payments(settlement_id, paid_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;

-- Settlements: Users can only manage their own records
CREATE POLICY "Users can view own settlements" 
  ON public.settlements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settlements" 
  ON public.settlements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settlements" 
  ON public.settlements FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settlements" 
  ON public.settlements FOR DELETE 
  USING (auth.uid() = user_id);

-- Settlement Payments: Users can only access payments for their own settlements
CREATE POLICY "Users can view own settlement payments" 
  ON public.settlement_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements 
      WHERE settlements.id = settlement_payments.settlement_id 
      AND settlements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own settlement payments" 
  ON public.settlement_payments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.settlements 
      WHERE settlements.id = settlement_payments.settlement_id 
      AND settlements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own settlement payments" 
  ON public.settlement_payments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements 
      WHERE settlements.id = settlement_payments.settlement_id 
      AND settlements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own settlement payments" 
  ON public.settlement_payments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.settlements 
      WHERE settlements.id = settlement_payments.settlement_id 
      AND settlements.user_id = auth.uid()
    )
  );
