import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireActiveUser } from "@/lib/auth/requireActiveUser";
import CreateBusinessForm from "./CreateBusinessForm";
import {
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default async function CreateBusinessPage() {
  const {
    supabase,
    user,
    profile,
  } = await requireActiveUser();

  if (profile?.role !== "business") {
    redirect("/account");
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingBusiness) {
    redirect("/business-dashboard");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name")
    .eq("active", true)
    .order("name");

  return (
    <>
      <Header />

      <main className="create11">
        <div className="create11-shell">
          <section className="create11-hero">
            <div>
              <span className="create11-eyebrow">
                <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
                Slottye Business
              </span>

              <h1>Crea tu negocio</h1>

              <p>
                Completa los datos esenciales para publicar tu ficha. Después podrás añadir imágenes, servicios, horarios y disponibilidad.
              </p>
            </div>

            <span className="create11-hero-icon" aria-hidden="true">
              <Building2 size={34} strokeWidth={1.8} />
            </span>
          </section>

          <div className="create11-layout">
            <aside className="create11-aside">
              <span>Antes de empezar</span>
              <h2>Una ficha lista para tus clientes</h2>

              <ul>
                <li><CheckCircle2 size={17} /> Importa datos desde Google Maps.</li>
                <li><CheckCircle2 size={17} /> Revisa la información antes de publicarla.</li>
                <li><CheckCircle2 size={17} /> Completa el resto desde el onboarding.</li>
              </ul>

              <p>Los campos marcados como obligatorios son suficientes para crear el negocio.</p>
            </aside>

            <section className="create11-form-card">
              <div className="create11-form-head">
                <span>Información pública</span>
                <h2>Datos del negocio</h2>
                <p>Podrás modificarlos cuando quieras desde “Editar mi negocio”.</p>
              </div>

              <CreateBusinessForm categories={categories ?? []} />
            </section>
          </div>
        </div>

        <style>{`
          .create11 { min-height: 100vh; padding: 22px 20px 58px; background: #f8f8fb; }
          .create11-shell { width: min(1180px, 100%); margin: 0 auto; }
          .create11-hero {
            display: flex; align-items: center; justify-content: space-between; gap: 24px;
            padding: 25px 28px; border: 1px solid var(--border); border-radius: 21px;
            background: radial-gradient(circle at 88% 10%, rgba(112,87,245,.11), transparent 34%), #fff;
            box-shadow: 0 16px 42px rgba(31,27,48,.04);
          }
          .create11-eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--accent-dark); font-size: 12px; font-weight: 850; }
          .create11-hero h1 { margin: 7px 0 7px; font-size: clamp(32px,4vw,42px); line-height: 1.06; letter-spacing: -.045em; }
          .create11-hero p { max-width: 680px; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
          .create11-hero-icon { width: 66px; height: 66px; display: grid; place-items: center; flex: 0 0 66px; border-radius: 20px; background: #eeeaff; color: var(--accent-dark); }
          .create11-layout { display: grid; grid-template-columns: 280px minmax(0,1fr); align-items: start; gap: 16px; margin-top: 16px; }
          .create11-aside, .create11-form-card { border: 1px solid var(--border); border-radius: 19px; background: #fff; box-shadow: 0 10px 30px rgba(31,27,48,.03); }
          .create11-aside { position: sticky; top: 86px; padding: 21px; }
          .create11-aside > span, .create11-form-head > span { color: var(--accent-dark); font-size: 12px; font-weight: 850; }
          .create11-aside h2 { margin: 6px 0 16px; font-size: 20px; line-height: 1.25; }
          .create11-aside ul { display: grid; gap: 13px; margin: 0; padding: 0; list-style: none; }
          .create11-aside li { display: grid; grid-template-columns: 18px 1fr; gap: 8px; color: #494553; font-size: 12.5px; line-height: 1.45; }
          .create11-aside li svg { color: #1b9b59; }
          .create11-aside > p { margin: 18px 0 0; padding-top: 16px; border-top: 1px solid #efedf2; color: var(--muted); font-size: 13px; line-height: 1.5; }
          .create11-form-card { padding: 23px; }
          .create11-form-head { padding-bottom: 18px; border-bottom: 1px solid #efedf2; }
          .create11-form-head h2 { margin: 5px 0 5px; font-size: 23px; }
          .create11-form-head p { margin: 0; color: var(--muted); font-size: 12.5px; }
          @media (max-width: 820px) {
            .create11 { padding: 16px 11px 44px; }
            .create11-layout { grid-template-columns: 1fr; }
            .create11-aside { position: static; }
          }
          @media (max-width: 600px) {
            .create11-hero { align-items: flex-start; padding: 20px 18px; }
            .create11-hero-icon { display: none; }
            .create11-hero h1 { font-size: 31px; }
            .create11-form-card { padding: 17px; }
          }
        `}</style>
      </main>
    </>
  );
}
