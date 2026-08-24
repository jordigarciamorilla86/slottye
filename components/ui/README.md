# Diálogos compartidos

`Dialog` es la base accesible y controlada. Renderiza en un portal, bloquea el scroll, atrapa el foco, cierra con Escape o backdrop y devuelve el foco al elemento que abrió el diálogo.

```tsx
const [open, setOpen] = useState(false);

<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Editar servicio"
  description="Actualiza la información que verán tus clientes."
  footer={<button onClick={save}>Guardar</button>}
>
  {/* formulario */}
</Dialog>
```

`ConfirmDialog` cubre confirmaciones neutras, avisos y operaciones destructivas. No se cierra automáticamente tras `onConfirm`: el consumidor decide cuándo cerrarlo, normalmente después de completar y validar su operación.

```tsx
<ConfirmDialog
  open={confirming}
  onOpenChange={setConfirming}
  title="Eliminar negocio"
  description="Esta acción elimina sus servicios y no se puede deshacer."
  variant="danger"
  confirmText="ELIMINAR"
  onConfirm={async () => {
    await removeBusiness();
    setConfirming(false);
  }}
/>
```

- `variant`: `neutral`, `warning` o `danger`.
- `confirmText`: exige una coincidencia exacta antes de habilitar la acción.
- `pending`: permite controlar externamente el estado ocupado; las promesas devueltas por `onConfirm` también activan ese estado.
- `initialFocusRef`: en `Dialog`, permite elegir el foco inicial; por defecto se usa el primer control o el propio diálogo.
