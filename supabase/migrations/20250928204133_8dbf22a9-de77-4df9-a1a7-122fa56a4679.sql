-- Criar alguns clientes de exemplo para a empresa
INSERT INTO public.customers (company_id, name, phone, email, address, neighborhood, city, state, zip_code)
VALUES 
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'João Silva', '11999887766', 'joao@email.com', 'Rua das Flores, 123', 'Centro', 'São Paulo', 'SP', '01000-000'),
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Maria Santos', '11988776655', 'maria@email.com', 'Av. Paulista, 456', 'Bela Vista', 'São Paulo', 'SP', '01310-100'),
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Pedro Oliveira', '11977665544', 'pedro@email.com', 'Rua Augusta, 789', 'Jardins', 'São Paulo', 'SP', '01305-000'),
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Ana Costa', '11966554433', 'ana@email.com', 'Rua Oscar Freire, 321', 'Pinheiros', 'São Paulo', 'SP', '05409-010'),
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Carlos Ferreira', '11955443322', null, 'Rua Teodoro Sampaio, 654', 'Pinheiros', 'São Paulo', 'SP', '05406-050');

-- Criar 5 pedidos de exemplo
INSERT INTO public.orders (company_id, customer_name, customer_phone, address, total, status, type, payment_method, items, order_number, delivery_fee, observations, estimated_time)
VALUES 
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'João Silva', '11999887766', 'Rua das Flores, 123 - Centro', 45.90, 'pending', 'delivery', 'dinheiro', 
   '[{"id": "1", "name": "Pizza Margherita", "price": 35.90, "quantity": 1}, {"id": "2", "name": "Refrigerante 2L", "price": 10.00, "quantity": 1}]'::jsonb, 
   '001', 5.00, 'Sem cebola na pizza', 30),
   
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Maria Santos', '11988776655', 'Av. Paulista, 456 - Bela Vista', 89.80, 'preparando', 'delivery', 'cartão', 
   '[{"id": "3", "name": "Hambúrguer Especial", "price": 28.90, "quantity": 2}, {"id": "4", "name": "Batata Frita", "price": 15.00, "quantity": 2}, {"id": "5", "name": "Suco Natural", "price": 8.00, "quantity": 1}]'::jsonb, 
   '002', 5.00, 'Bem passado', 45),
   
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Pedro Oliveira', '11977665544', 'Mesa 5', 32.90, 'pronto', 'balcao', 'pix', 
   '[{"id": "6", "name": "Prato do Dia", "price": 29.90, "quantity": 1}, {"id": "7", "name": "Sobremesa", "price": 12.00, "quantity": 1}]'::jsonb, 
   '003', 0, 'Cliente vai retirar', 15),
   
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Ana Costa', '11966554433', 'Rua Oscar Freire, 321 - Pinheiros', 67.70, 'em_entrega', 'delivery', 'dinheiro', 
   '[{"id": "8", "name": "Combo Família", "price": 59.90, "quantity": 1}, {"id": "9", "name": "Refrigerante 1L", "price": 7.80, "quantity": 1}]'::jsonb, 
   '004', 8.00, 'Troco para R$ 100', 40),
   
  ('d09a06e5-9c4b-480a-b7d0-11b3ca943039', 'Carlos Ferreira', '11955443322', 'Rua Teodoro Sampaio, 654 - Pinheiros', 25.90, 'concluido', 'delivery', 'cartão', 
   '[{"id": "10", "name": "Sanduíche Natural", "price": 18.90, "quantity": 1}, {"id": "11", "name": "Água Mineral", "price": 4.00, "quantity": 1}]'::jsonb, 
   '005', 5.00, null, 25);