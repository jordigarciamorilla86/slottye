# Pruebas E2E

Estas pruebas están pensadas para localhost o un entorno de staging. El helper bloquea explícitamente `slottye.com` y `www.slottye.com` cuando `TEST_BASE_URL` apunta a esos dominios.

Variables admitidas:

- `TEST_BASE_URL`: URL de localhost o staging utilizada como `baseURL` de Playwright. Producción (`slottye.com` y sus subdominios) está bloqueada.
- `TEST_PUBLIC_SEARCH_QUERY`: consulta pública opcional.
- `TEST_CLIENT_EMAIL` y `TEST_CLIENT_PASSWORD`: cuenta de cliente exclusiva para pruebas.
- `TEST_BOOKING_DISCOVERY_PATH`: ruta relativa que muestra al menos una cita reservable.
- `TEST_BUSINESS_EMAIL` y `TEST_BUSINESS_PASSWORD`: cuenta de negocio exclusiva para pruebas.
- `TEST_AGENDA_SEARCH_QUERY`: búsqueda opcional y no destructiva en la agenda.

Si faltan credenciales, Playwright marca claramente esos bloques como omitidos. Los smoke públicos siguen ejecutándose.

Las cuentas y datos deben pertenecer exclusivamente a staging. La suite normal no elimina datos ni confirma, cancela o mueve reservas.

## Ciclo destructivo controlado de reserva

`booking-lifecycle.destructive.spec.ts` crea una reserva real con la cuenta
`TEST_CLIENT_*`, comprueba que aparece en **Mis citas** y la cancela. La suite es
serial y está desactivada salvo que se defina explícitamente:

```powershell
$env:ALLOW_DESTRUCTIVE_E2E="true"
npx playwright test tests/e2e/booking-lifecycle.destructive.spec.ts
```

Antes de usarla, confirma que `TEST_BOOKING_DISCOVERY_PATH` ofrece un horario con
antelación suficiente para permitir su cancelación. El test registra el ID,
servicio, fecha y hora creados, y ejecuta un cleanup por API en `finally` si la
cancelación desde la interfaz falla. Nunca elimina cuentas ni negocios.

Hay dos barreras independientes contra producción: Playwright y el propio test
rechazan `slottye.com` y cualquier subdominio. No actives esta suite contra datos
que no sean de prueba.

## Flujos restaurables de cuenta

`account-flows.destructive.spec.ts` comprueba tres operaciones reales y restaura
el estado original al terminar:

- cambia la contraseña, abre otra página protegida y recupera la contraseña original;
- quita y vuelve a añadir un favorito (o restaura "no favorito" si ese era el estado inicial);
- publica una reseña sobre una reserva `COMPLETED` sin reseña y la elimina mediante
  el cliente de servicio durante el cleanup.

Requiere además `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, ya
presentes en la configuración normal del proyecto. Los secretos nunca se escriben
en la salida. Si no existe una reserva completada sin valorar, la prueba crea una
reserva temporal, la completa para verificar RLS y finalmente elimina reseña y
reserva y devuelve el horario a `AVAILABLE`. Ejecución aislada recomendada:

```powershell
$env:ALLOW_DESTRUCTIVE_E2E="true"
npx playwright test tests/e2e/account-flows.destructive.spec.ts --workers=1
```

Las variables pueden guardarse en `.env.local`, que no se versiona. Playwright carga ese archivo automáticamente antes de ejecutar la suite.
