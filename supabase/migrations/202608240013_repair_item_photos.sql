begin;

alter table public.customer_repair_items
  add column if not exists photo_path text,
  add column if not exists photo_original_name text,
  add column if not exists photo_mime_type text,
  add column if not exists photo_size_bytes bigint;

alter table public.customer_repair_items
  drop constraint if exists customer_repair_items_photo_metadata_check,
  add constraint customer_repair_items_photo_metadata_check check (
    (photo_path is null and photo_original_name is null and photo_mime_type is null and photo_size_bytes is null)
    or
    (photo_path is not null and photo_original_name is not null and photo_mime_type is not null and photo_size_bytes between 1 and 8388608)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-item-photos',
  'repair-item-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
