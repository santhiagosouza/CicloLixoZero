
DO $$
DECLARE
  v_client uuid := '0d24be2a-f36b-4d56-a732-e2b80175f8a7';
  v_user uuid;
  v_grav uuid;
  v_started timestamptz;
  v_ended timestamptz;
  i int;
  j int;
  v_sector uuid;
  v_sub record;
BEGIN
  -- Pega um usuário admin do cliente (pode ser nulo)
  SELECT user_id INTO v_user FROM user_roles
    WHERE client_id = v_client AND role IN ('client_admin','client_user')
    LIMIT 1;

  FOR i IN 1..4 LOOP
    v_started := now() - ((4 - i) * interval '7 days');
    v_ended := v_started + interval '4 hours';

    INSERT INTO gravimetrias (client_id, started_at, ended_at, started_by)
    VALUES (v_client, v_started, v_ended, v_user)
    RETURNING id INTO v_grav;

    -- 12 lançamentos por gravimetria, setores e subcategorias variados
    FOR j IN 1..12 LOOP
      SELECT id INTO v_sector FROM sectors
        WHERE client_id = v_client
        ORDER BY random() LIMIT 1;

      SELECT id, category_id INTO v_sub FROM subcategories
        WHERE client_id = v_client
        ORDER BY random() LIMIT 1;

      INSERT INTO weighings (client_id, gravimetria_id, sector_id, category_id, subcategory_id, peso_kg, data, created_by)
      VALUES (
        v_client, v_grav, v_sector, v_sub.category_id, v_sub.id,
        round((random() * 49 + 1)::numeric, 2),
        (v_started)::date,
        v_user
      );
    END LOOP;
  END LOOP;
END $$;
