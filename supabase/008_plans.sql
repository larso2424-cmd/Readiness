-- Add plan columns to users table
alter table users add column if not exists plan text not null default 'free';
alter table users add column if not exists plan_expires_at timestamptz;
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists stripe_subscription_id text;

-- Index for quick plan lookups
create index if not exists users_stripe_customer_id_idx on users(stripe_customer_id);
