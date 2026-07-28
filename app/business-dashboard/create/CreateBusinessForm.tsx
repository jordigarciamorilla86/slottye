"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateBusinessForm({
  categories,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const baseSlug = createSlug(name);

    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

    const { error } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        category_id: categoryId || null,
        name,
        slug,
        description,
        address,
        city,
        postal_code: postalCode,
        phone,
        email,
        website,
        active: true,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/business-dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 12,
        marginTop: 24,
      }}
    >
      <label>
        <strong>Nombre del negocio</strong>

        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Clínica Dental Maresme"
          style={inputStyle}
        />
      </label>

      <label>
        <strong>Categoría</strong>

        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={inputStyle}
        >
          <option value="">
            Selecciona una categoría
          </option>

          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <strong>Descripción</strong>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe brevemente tu negocio..."
          rows={5}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </label>

      <label>
        <strong>Dirección</strong>

        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Carrer de Barcelona, 25"
          style={inputStyle}
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 2fr) minmax(120px, 1fr)",
          gap: 12,
        }}
      >
        <label>
          <strong>Ciudad</strong>

          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mataró"
            style={inputStyle}
          />
        </label>

        <label>
          <strong>Código postal</strong>

          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="08301"
            style={inputStyle}
          />
        </label>
      </div>

      <label>
        <strong>Teléfono</strong>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="937 000 000"
          style={inputStyle}
        />
      </label>

      <label>
        <strong>Email público</strong>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="info@negocio.com"
          style={inputStyle}
        />
      </label>

      <label>
        <strong>Web</strong>

        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://www.negocio.com"
          style={inputStyle}
        />
      </label>

      <button
        className="btn primary"
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        {loading
          ? "Creando negocio..."
          : "Crear negocio"}
      </button>

      {message && (
        <p className="muted">
          {message}
        </p>
      )}
    </form>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  border: "1px solid var(--border)",
  borderRadius: 14,
  marginTop: 8,
  background: "var(--card)",
  color: "var(--text)",
};