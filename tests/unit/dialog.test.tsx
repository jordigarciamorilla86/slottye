import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog, Dialog } from "@/components/ui";

afterEach(cleanup);

function DialogFixture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir</button>
      <Dialog open={open} onOpenChange={setOpen} title="Preferencias">
        <button type="button">Primero</button>
        <button type="button">Último</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("gestiona foco, Escape, scroll y retorno de foco", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);
    const trigger = screen.getByRole("button", { name: "Abrir" });

    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Preferencias" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cerrar diálogo" })).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe("");
  });

  it("mantiene Tab dentro del diálogo", async () => {
    const user = userEvent.setup();
    render(<DialogFixture />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const close = await screen.findByRole("button", { name: "Cerrar diálogo" });
    const last = screen.getByRole("button", { name: "Último" });
    last.focus();

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});

describe("ConfirmDialog", () => {
  it("exige el texto exacto y espera la confirmación asíncrona", async () => {
    const user = userEvent.setup();
    let resolveConfirmation: (() => void) | undefined;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { resolveConfirmation = resolve; }));
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Eliminar cuenta"
        description="No podrás recuperar tus datos."
        variant="danger"
        confirmText="ELIMINAR"
        onConfirm={onConfirm}
      />,
    );

    const input = await screen.findByRole("textbox", { name: /Escribe ELIMINAR/ });
    const confirm = screen.getByRole("button", { name: "Eliminar" });
    expect(input).toHaveFocus();
    expect(confirm).toBeDisabled();

    await user.type(input, "eliminar");
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, "ELIMINAR");
    await user.click(confirm);

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Procesando…" })).toBeDisabled();
    resolveConfirmation?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "Eliminar" })).toBeEnabled());
  });
});
