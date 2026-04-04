-- Tabulka inzerátů
create table inzeraty (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nazev text not null,
  popis text,
  predmet text not null,
  lokalita text,
  cena_od integer,
  cena_do integer,
  cena_dohodou boolean default false,
  koho_hledam text,
  obrazek_url text,
  autor_jmeno text,
  autor_email text
);

-- Povol čtení pro všechny (veřejné inzeráty)
alter table inzeraty enable row level security;

create policy "Inzeráty vidí všichni"
  on inzeraty for select
  using (true);

create policy "Přidat může jen přihlášený"
  on inzeraty for insert
  with check (auth.uid() = user_id);

create policy "Upravit může jen vlastník"
  on inzeraty for update
  using (auth.uid() = user_id);

create policy "Smazat může jen vlastník"
  on inzeraty for delete
  using (auth.uid() = user_id);

-- Profily uživatelů (auto-vytvoří se při registraci)
create table profily (
  id uuid references auth.users(id) on delete cascade primary key,
  created_at timestamp with time zone default now(),
  jmeno text,
  prijmeni text,
  telefon text,
  avatar_url text
);

alter table profily enable row level security;

create policy "Profil vidí všichni"
  on profily for select using (true);

create policy "Profil upraví jen vlastník"
  on profily for update using (auth.uid() = id);

-- Trigger: automaticky vytvoří profil při registraci
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profily (id, jmeno, prijmeni)
  values (
    new.id,
    new.raw_user_meta_data->>'jmeno',
    new.raw_user_meta_data->>'prijmeni'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Zájem o inzerát ───────────────────────────────────
create table zajem (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  inzerat_id uuid references inzeraty(id) on delete cascade not null,
  od_user_id uuid references auth.users(id) on delete cascade not null,
  zprava text,
  od_email text,
  od_jmeno text
);

alter table zajem enable row level security;

-- Vlastník inzerátu vidí zájem o svůj inzerát
create policy "Vlastník vidí zájem"
  on zajem for select
  using (
    auth.uid() = od_user_id
    or auth.uid() = (select user_id from inzeraty where id = zajem.inzerat_id)
  );

-- Přihlášený může projevit zájem
create policy "Přihlášený může projevit zájem"
  on zajem for insert
  with check (auth.uid() = od_user_id);

create policy "Smazat může jen odesílatel"
  on zajem for delete
  using (auth.uid() = od_user_id);
