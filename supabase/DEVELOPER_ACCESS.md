# LinuxFIX developer access

Developer and administrator access is stored in `public.developer_access`.
The Expo client may only read the current user's enabled row. It cannot grant,
change, or revoke roles.

After applying the migrations, assign a role from the Supabase SQL Editor using
the internal email of an existing confirmed account. Username accounts use the
form `USERNAME@login.linuxfix.invalid`:

```sql
insert into public.developer_access (user_id, access_level)
select id, 'admin'
from auth.users
where lower(email) = lower('YOUR_LOGIN_EMAIL')
on conflict (user_id) do update
set access_level = excluded.access_level,
    enabled = true;
```

Use `developer` instead of `admin` for testing access without the administrator
label. Sign out and sign back in after changing the role.

Never add a Supabase secret key or service-role key to the Expo application.
Any future privileged action must also verify this role on a trusted backend;
hiding a button in the mobile interface is not authorization.
