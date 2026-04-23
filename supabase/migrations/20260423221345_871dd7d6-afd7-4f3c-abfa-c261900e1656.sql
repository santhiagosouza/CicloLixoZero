
DO $$
DECLARE
  v_client uuid := '0d24be2a-f36b-4d56-a732-e2b80175f8a7';
  v_user uuid;
  v_grav uuid;
  v_started timestamptz;
  v_ended timestamptz;
  v_sector uuid;
  v_sub_id uuid;
  v_cat_id uuid;
  i int;
  j int;
  remaining numeric;
  qty int;
  alloc numeric;
  cat_target record;
BEGIN
  -- Limpa gravimetrias e pesagens (cascade)
  DELETE FROM gravimetrias WHERE client_id = v_client;

  SELECT user_id INTO v_user FROM user_roles
    WHERE client_id = v_client AND role IN ('client_admin','client_user') LIMIT 1;

  -- Cria 4 gravimetrias e divide o total alvo de cada categoria entre elas
  FOR i IN 1..4 LOOP
    v_started := now() - ((4 - i) * interval '7 days');
    v_ended := v_started + interval '4 hours';

    INSERT INTO gravimetrias (client_id, started_at, ended_at, started_by)
    VALUES (v_client, v_started, v_ended, v_user)
    RETURNING id INTO v_grav;

    -- Para cada categoria-alvo, sortear ~6 lançamentos somando o quarto do total
    FOR cat_target IN
      SELECT * FROM (VALUES
        ('Orgânico', 923.0/4),
        ('Reciclável', 350.0/4),
        ('Perigoso', 66.0/4),
        ('Rejeito', 56.0/4)
      ) AS t(cname, target)
    LOOP
      SELECT id INTO v_cat_id FROM categories WHERE name = cat_target.cname LIMIT 1;
      IF v_cat_id IS NULL THEN CONTINUE; END IF;

      remaining := cat_target.target;
      qty := 6;
      FOR j IN 1..qty LOOP
        SELECT id INTO v_sector FROM sectors
          WHERE client_id = v_client ORDER BY random() LIMIT 1;
        SELECT id INTO v_sub_id FROM subcategories
          WHERE client_id = v_client AND category_id = v_cat_id
          ORDER BY random() LIMIT 1;
        IF v_sub_id IS NULL THEN CONTINUE; END IF;

        IF j = qty THEN
          alloc := round(remaining::numeric, 2);
        ELSE
          -- valor aleatório entre 60% e 140% da média restante
          alloc := round(((remaining / (qty - j + 1)) * (0.6 + random() * 0.8))::numeric, 2);
          IF alloc <= 0 THEN alloc := 0.01; END IF;
          IF alloc > remaining - 0.01 * (qty - j) THEN
            alloc := round((remaining / (qty - j + 1))::numeric, 2);
          END IF;
        END IF;
        remaining := remaining - alloc;

        INSERT INTO weighings (client_id, gravimetria_id, sector_id, category_id, subcategory_id, peso_kg, data, created_by)
        VALUES (v_client, v_grav, v_sector, v_cat_id, v_sub_id, alloc, v_started::date, v_user);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
