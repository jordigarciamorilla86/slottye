function LegendItem({
  color,
  border,
  label,
}: {
  color: string;
  border: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          flex: "0 0 9px",
          borderRadius: "50%",
          background: color,
          border: `1px solid ${border}`,
          display: "inline-block",
        }}
      />

      <span
        style={{
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function AgendaLegend() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px 10px",
        flexWrap: "wrap",
        marginBottom: 12,
        fontSize: 11,
        lineHeight: 1.2,
      }}
    >
      <LegendItem
        color="#a855f7"
        border="#7e22ce"
        label="Reserva"
      />

      <LegendItem
        color="#f3f4f6"
        border="#9ca3af"
        label="Completada"
      />

      <LegendItem
        color="#3b82f6"
        border="#2563eb"
        label="Manual"
      />

      <LegendItem
        color="#ef4444"
        border="#dc2626"
        label="Bloqueado"
      />

      <LegendItem
        color="#ffffff"
        border="#9ca3af"
        label="Fuera horario"
      />
    </div>
  );
}