"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";
type Role = "customer" | "business";

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode =
  searchParams.get("mode") === "signup" ? "signup" : "login";

  const initialRole: Role =
  searchParams.get("role") === "business" ? "business" : "customer";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("error") ? "No se pudo completar el acceso. Inténtalo de nuevo." : ""
  );
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleGoogle() {
    setLoading(true);
    setMessage("");
    const redirectTo = `${window.location.origin}/auth/callback?role=${role}&next=/account`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      });

      if (error) setMessage(error.message);
      else setMessage("Cuenta creada. Revisa tu email si Supabase tiene activada la confirmación de correo.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <>
      <Header />
      <main className="shell detail" style={{ maxWidth: 600 }}>
        <section className="panel">
          <div className="kicker">Tu cuenta Slottye</div>
          <h1 className="business-title">{mode === "login" ? "Entrar" : "Crear cuenta"}</h1>
          <p className="muted">
            {mode === "login"
              ? "Gestiona tus citas, favoritos y avisos."
              : "Regístrate como cliente o como negocio."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "18px 0" }}>
            <button className={`btn ${mode === "login" ? "primary" : ""}`} onClick={() => setMode("login")}>Entrar</button>
            <button className={`btn ${mode === "signup" ? "primary" : ""}`} onClick={() => setMode("signup")}>Crear cuenta</button>
          </div>

          {mode === "signup" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <button className={`btn ${role === "customer" ? "primary" : ""}`} onClick={() => setRole("customer")}>Soy cliente</button>
              <button className={`btn ${role === "business" ? "primary" : ""}`} onClick={() => setRole("business")}>Soy negocio</button>
            </div>
          )}

          <button className="btn" style={{ width: "100%", marginBottom: 16 }} onClick={handleGoogle} disabled={loading}>
            Continuar con Google
          </button>

          <div className="muted" style={{ textAlign: "center", marginBottom: 16 }}>o con email</div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === "business" ? "Nombre del responsable" : "Tu nombre"}
                style={inputStyle}
              />
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
            <input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password" style={inputStyle} />
            <button className="btn primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Procesando…" : mode === "login" ? "Entrar con email" : "Crear cuenta"}
            </button>
          </form>

          {message && <p style={{ marginTop: 14 }} className="muted">{message}</p>}
        </section>
      </main>
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  border: "1px solid var(--border)",
  borderRadius: 14,
  marginBottom: 10,
  background: "var(--card)",
  color: "var(--text)",
};
