-- Bucket privado para capturas de gráficos + RLS por carpeta de usuario.
-- Convención de ruta: <user_id>/<trade_id>/<filename>

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- storage.objects ya tiene RLS habilitado por Supabase; añadimos las policies.
-- El primer segmento de la ruta debe ser el uid del usuario.

drop policy if exists "screenshots_select" on storage.objects;
create policy "screenshots_select" on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "screenshots_insert" on storage.objects;
create policy "screenshots_insert" on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "screenshots_delete" on storage.objects;
create policy "screenshots_delete" on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
