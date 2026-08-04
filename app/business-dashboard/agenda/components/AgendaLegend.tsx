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
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          border: `1px solid ${border}`,
          display: "inline-block",
        }}
      />

      <span>{label}</span>
    </div>
  );
}

export default function AgendaLegend() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 16,
        fontSize: 13,
      }}
    >
      <LegendItem
        color="#22c55e"
        border="#15803d"
        label="Disponible"
      />

      <LegendItem
        color="#a855f7"
        border="#7e22ce"
        label="Reserva Slottye"
      />

      <LegendItem
        color="#f3f4f6"
        border="#9ca3af"
        label="Completada"
      />

      <LegendItem
        color="#3b82f6"
        border="#2563eb"
        label="Reserva manual"
      />

      <LegendItem
        color="#ef4444"
        border="#dc2626"
        label="Bloqueado"
      />

      <LegendItem
        color="#ffffff"
        border="#9ca3af"
        label="Fuera de horario"
      />
    </div>
  );
}