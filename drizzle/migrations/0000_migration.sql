create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null unique, roll_no text not null, department text not null, year int not null,
  created_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text not null default '', category text not null,
  club text not null, contact text not null default '', image_url text,
  starts_at timestamptz not null, ends_at timestamptz not null, registration_deadline timestamptz not null,
  is_online boolean not null default false, venue text not null default '', meeting_url text,
  fee int not null default 0, capacity int, activity_points int not null default 0,
  eligibility text not null default 'Open to all students', what_to_bring text not null default '',
  agenda text not null default '', is_cancelled boolean not null default false, featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','cancelled')),
  phone text not null default '', note text not null default '',
  attended boolean not null default false,
  created_at timestamptz not null default now(), cancelled_at timestamptz
);
create unique index registrations_active_unique on public.registrations(event_id, student_id) where status = 'registered';
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text not null, message text not null, kind text not null default 'general',
  created_at timestamptz not null default now()
);

create or replace function public.check_registration() returns trigger language plpgsql security definer set search_path = public as $$
declare e public.events; n int;
begin
  if new.status <> 'registered' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'registered' then return new; end if;
  select * into e from public.events where id = new.event_id;
  if e.is_cancelled then raise exception 'This event has been cancelled'; end if;
  if now() > e.registration_deadline then raise exception 'Registration deadline has passed'; end if;
  if e.capacity is not null then
    select count(*) into n from public.registrations where event_id = new.event_id and status = 'registered';
    if n >= e.capacity then raise exception 'This event is full'; end if;
  end if;
  return new;
end $$;
create trigger trg_check_registration before insert or update on public.registrations for each row execute function public.check_registration();

grant select, insert, update, delete on public.students, public.events, public.registrations, public.announcements to anon, authenticated;
grant all on public.students, public.events, public.registrations, public.announcements to service_role;
alter table public.students enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.announcements enable row level security;
create policy "demo read students" on public.students for select to anon, authenticated using (true);
create policy "demo all events" on public.events for all to anon, authenticated using (true) with check (true);
create policy "demo all registrations" on public.registrations for all to anon, authenticated using (true) with check (true);
create policy "demo all announcements" on public.announcements for all to anon, authenticated using (true) with check (true);

insert into public.students (name,email,roll_no,department,year) values
('Brunda S','brunda@college.edu','CS21045','Computer Science',3),
('Arjun Mehta','arjun@college.edu','EC22011','Electronics',2),
('Priya Nair','priya@college.edu','ME20033','Mechanical',4),
('Rahul Verma','rahul@college.edu','CS23007','Computer Science',1);

insert into public.events (title,description,category,club,contact,image_url,starts_at,ends_at,registration_deadline,is_online,venue,fee,capacity,activity_points,eligibility,what_to_bring,agenda,featured) values
('HackNight 2026','A 24-hour hackathon to build solutions for campus problems. Teams of up to 4. Mentors from industry, prizes worth ₹50,000.','Technical','Coding Club','codingclub@college.edu','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',now()+interval '5 days',now()+interval '6 days',now()+interval '4 days',false,'Main Auditorium, Block A',0,120,20,'All years','Laptop, charger, student ID','6PM Kickoff · 9PM Mentor round · 6AM Demos',true),
('Rhythm — Cultural Fest','Annual inter-department cultural night with dance, music and theatre performances.','Cultural','Cultural Committee','culture@college.edu','https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',now()+interval '10 days',now()+interval '10 days 5 hours',now()+interval '8 days',false,'Open Air Theatre',100,500,10,'All students','Student ID','5PM Opening · 6PM Performances · 9PM Prizes',true),
('Inter-College Football Cup','Knockout football tournament. Register as a player; teams formed by the sports committee.','Sports','Sports Council','sports@college.edu','https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200',now()+interval '3 days',now()+interval '3 days 8 hours',now()+interval '2 days',false,'College Ground',0,40,15,'Players with fitness clearance','Boots, water bottle','',false),
('Intro to Machine Learning','Hands-on workshop covering regression, classification and a mini Kaggle task in Python.','Workshop','AI Society','ai@college.edu','https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200',now()+interval '1 day',now()+interval '1 day 3 hours',now()+interval '20 hours',false,'Lab 204, CS Block',50,30,8,'2nd year and above','Laptop with Python installed','',true),
('Startup Pitch Arena','Pitch your startup idea to a panel of investors and alumni founders.','Competition','E-Cell','ecell@college.edu','https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',now()+interval '14 days',now()+interval '14 days 4 hours',now()+interval '12 days',false,'Seminar Hall 2',0,null,12,'All students','Pitch deck (max 8 slides)','',false),
('Careers in Cloud — Webinar','Alumni from leading cloud companies talk about careers, certifications and internships.','Seminar','Placement Cell','placements@college.edu','https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',now()+interval '7 days',now()+interval '7 days 2 hours',now()+interval '7 days',true,'Online',0,null,4,'All students','','',false);

insert into public.registrations (event_id, student_id)
select e.id, s.id from public.events e cross join public.students s where e.title in ('HackNight 2026','Intro to Machine Learning') and s.name <> 'Rahul Verma';

insert into public.announcements (event_id,title,message,kind)
select id,'Venue updated','HackNight moves to the Main Auditorium due to expected turnout.','venue' from public.events where title='HackNight 2026';
insert into public.announcements (title,message,kind) values ('Welcome to EventHub','Discover and register for every campus event in one place.','general');