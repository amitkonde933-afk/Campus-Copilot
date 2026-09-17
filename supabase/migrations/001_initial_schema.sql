-- Initial Schema Migration for Campus Copilot

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Auth synced public info)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    avatar_url text,
    google_name text,
    google_email text,
    google_avatar_url text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- 2. Student Profiles (Vault core data)
create table public.student_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique not null references auth.users(id) on delete cascade,
    full_name text,
    personal_email text,
    phone_number text,
    dob date,
    parent_name text,
    parent_relation text,
    parent_email text,
    parent_phone text,
    address1 text,
    address2 text,
    address3 text,
    locality text,
    landmark text,
    college_name text,
    course_info text,
    degree_pref text,
    studying_year text,
    reg_no text,
    roll_no text,
    college_email text,
    numeric_roll text,
    profile_completion integer default 0,
    onboarding_complete boolean default false,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.student_profiles enable row level security;

-- 3. Student Addresses
create table public.student_addresses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    address_type text not null, -- home, permanent, current
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    postal_code text,
    country text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.student_addresses enable row level security;

-- 4. User Settings
create table public.user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    theme text default 'light',
    accent_color text default 'default',
    density text default 'comfortable',
    switches jsonb default '{}'::jsonb, -- holds toggles like toggleAutofillEnabled, etc.
    pref_language text default 'en',
    pref_landing text default 'dashboard',
    select_ai_mode text default 'balanced',
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- 5. Form History
create table public.form_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    form_url text,
    form_title text,
    domain text,
    fields_detected integer default 0,
    fields_filled integer default 0,
    time_saved_seconds integer default 0,
    status text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    completed_at timestamptz
);

-- Enable RLS
alter table public.form_history enable row level security;

-- 6. Form Field History
create table public.form_field_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    form_history_id uuid references public.form_history(id) on delete cascade,
    field_type text,
    field_label text,
    field_name text,
    filled boolean,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.form_field_history enable row level security;

-- 7. Reviews
create table public.reviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    hostel_room text,
    water_feedback text,
    hostel_wifi_feedback text,
    cleanliness_feedback text,
    mess_rating_slider integer default 3,
    food_quality_feedback text,
    faculty_feedback text,
    club_interests text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reviews enable row level security;

-- 8. Emergency Contacts
create table public.emergency_contacts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    relationship text,
    name text,
    phone text,
    email text,
    address text,
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.emergency_contacts enable row level security;


-- ==================================================
-- RLS POLICIES FOR USER-OWNED RECORDS
-- ==================================================

-- A. profiles Policies
create policy "Users can select own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);

-- B. student_profiles Policies
create policy "Users can select own student profile" on public.student_profiles for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own student profile" on public.student_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own student profile" on public.student_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own student profile" on public.student_profiles for delete to authenticated using (auth.uid() = user_id);

-- C. student_addresses Policies
create policy "Users can select own addresses" on public.student_addresses for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own addresses" on public.student_addresses for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own addresses" on public.student_addresses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own addresses" on public.student_addresses for delete to authenticated using (auth.uid() = user_id);

-- D. user_settings Policies
create policy "Users can select own settings" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own settings" on public.user_settings for delete to authenticated using (auth.uid() = user_id);

-- E. form_history Policies
create policy "Users can select own form history" on public.form_history for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own form history" on public.form_history for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own form history" on public.form_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own form history" on public.form_history for delete to authenticated using (auth.uid() = user_id);

-- F. form_field_history Policies
create policy "Users can select own field history" on public.form_field_history for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own field history" on public.form_field_history for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own field history" on public.form_field_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own field history" on public.form_field_history for delete to authenticated using (auth.uid() = user_id);

-- G. reviews Policies
create policy "Users can select own reviews" on public.reviews for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own reviews" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own reviews" on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own reviews" on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- H. emergency_contacts Policies
create policy "Users can select own contacts" on public.emergency_contacts for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own contacts" on public.emergency_contacts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own contacts" on public.emergency_contacts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own contacts" on public.emergency_contacts for delete to authenticated using (auth.uid() = user_id);


-- ==================================================
-- GRANTS: REVOKE ALL FROM ANON, ONLY ALLOW AUTHENTICATED
-- ==================================================
revoke all on public.profiles from anon, authenticated;
revoke all on public.student_profiles from anon, authenticated;
revoke all on public.student_addresses from anon, authenticated;
revoke all on public.user_settings from anon, authenticated;
revoke all on public.form_history from anon, authenticated;
revoke all on public.form_field_history from anon, authenticated;
revoke all on public.reviews from anon, authenticated;
revoke all on public.emergency_contacts from anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.student_profiles to authenticated;
grant select, insert, update, delete on public.student_addresses to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.form_history to authenticated;
grant select, insert, update, delete on public.form_field_history to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.emergency_contacts to authenticated;


-- ==================================================
-- AUTOMATED USER SIGNUP TRIGGERS
-- ==================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, google_name, google_email, google_avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==================================================
-- 9. CUSTOM USER FORMS TABLE
-- ==================================================
create table public.custom_forms (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    form_name text not null,
    form_structure jsonb not null, -- contains sections & fields list
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.custom_forms enable row level security;

-- Policies
create policy "Users can select own custom forms" on public.custom_forms for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own custom forms" on public.custom_forms for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own custom forms" on public.custom_forms for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own custom forms" on public.custom_forms for delete to authenticated using (auth.uid() = user_id);

-- Grants
revoke all on public.custom_forms from anon, authenticated;
grant select, insert, update, delete on public.custom_forms to authenticated;

