-- Pending couriers may create only their own verification record.
create policy couriers_self_insert on public.couriers
  for insert with check (id = auth.uid() and verification_status = 'PENDING_VERIFICATION');
