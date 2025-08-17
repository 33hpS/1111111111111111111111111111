-- WASSER PRO - Unified Supabase Schema
-- Полная схема базы данных для синхронизации

-- 1. Таблица материалов
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  article TEXT,
  unit TEXT DEFAULT 'шт',
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Типы изделий  
CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  markup DECIMAL(5,2) DEFAULT 0,
  work_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Типы отделки
CREATE TABLE IF NOT EXISTS finish_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  markup DECIMAL(5,2) DEFAULT 0,
  work_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Коллекции
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  group_name TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  pinned BOOLEAN DEFAULT FALSE,
  cover_url TEXT,
  product_order JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Изделия
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  article TEXT,
  image_url TEXT,
  collection_id UUID REFERENCES collections(id),
  product_type_id UUID REFERENCES product_types(id),
  finish_type_id UUID REFERENCES finish_types(id),
  tech_card JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_materials_article ON materials(article);
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_group ON collections(group_name);

-- 7. RLS (Row Level Security) политики
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE finish_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Разрешить все операции для аутентифицированных пользователей
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON materials
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON product_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON finish_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON collections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. View для экспорта продуктов с расчетами
CREATE OR REPLACE VIEW v_products_export AS
SELECT 
  p.id,
  p.name,
  p.article,
  p.image_url,
  c.name as collection_name,
  pt.name as product_type_name,
  ft.name as finish_type_name,
  p.tech_card,
  p.created_at,
  p.updated_at,
  -- Расчет материальных затрат
  (
    SELECT COALESCE(SUM(
      (tc_item->>'quantity')::numeric * COALESCE(m.price, 0)
    ), 0)
    FROM jsonb_array_elements(p.tech_card) AS tc_item
    LEFT JOIN materials m ON m.id::text = tc_item->>'materialId'
  ) as material_cost,
  -- Стоимость работ
  COALESCE(pt.work_cost, 0) as work_cost,
  -- Наценка типа изделия
  COALESCE(pt.markup, 0) as product_markup,
  -- Наценка отделки
  COALESCE(ft.markup, 0) as finish_markup
FROM products p
LEFT JOIN collections c ON p.collection_id = c.id
LEFT JOIN product_types pt ON p.product_type_id = pt.id
LEFT JOIN finish_types ft ON p.finish_type_id = ft.id;

-- 9. Функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для всех таблиц
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON product_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_finish_types_updated_at BEFORE UPDATE ON finish_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Тестовые данные (опционально)
INSERT INTO materials (name, article, unit, price) VALUES
  ('ЛДСП 18мм Белый', 'LDSP-18-W', 'м²', 850.00),
  ('Кромка ПВХ 2мм', 'EDGE-2-PVC', 'пог.м', 35.00),
  ('Петля clip-on', 'HINGE-CLIP', 'шт', 120.00)
ON CONFLICT DO NOTHING;

INSERT INTO product_types (name, markup, work_cost) VALUES
  ('Тумба с дверями', 10.00, 1000.00),
  ('Тумба с ящиками', 15.00, 1500.00),
  ('Пенал', 20.00, 2000.00)
ON CONFLICT DO NOTHING;

INSERT INTO finish_types (name, markup) VALUES
  ('Крашеный', 50.00),
  ('Пленочный', 30.00)
ON CONFLICT DO NOTHING;

-- Готово!
COMMENT ON SCHEMA public IS 'WASSER PRO - Schema version 1.0';
