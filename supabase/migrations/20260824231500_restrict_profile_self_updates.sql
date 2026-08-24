/*
 * RLS limita la fila que un usuario puede actualizar, pero no las columnas.
 * Sin privilegios por columna, profiles_update_own permitia modificar role,
 * is_admin e is_blocked y, por tanto, escalar privilegios.
 */

revoke update on table public.profiles from authenticated;

grant update (name, avatar_url) on table public.profiles to authenticated;

