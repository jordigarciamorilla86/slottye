import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { BusinessCard } from "@/components/BusinessCard";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function CategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { q } = await searchParams;

  const supabase = await createClient();

  let categoryName = "Todos los negocios";
  let categoryId: string | null = null;

  if (slug !== "todos") {
    const { data: category } = await supabase
      .from("categories")
      .select("id,name")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (!category) {
      notFound();
    }

    categoryName = category.name;
    categoryId = category.id;
  }

  let query = supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      description,
      address,
      city,
      phone,
      website,
      category_id
    `)
    .eq("active", true)
    .order("name");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (q?.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data: businesses, error } = await query;

  if (error) {
    console.error("Error loading businesses:", error);
  }

  return (
    <>
      <Header />

      <main className="shell detail">
        <section className="section">
          <div className="section-head">
            <div>
              <div className="kicker">
                Explora Slottye
              </div>

              <h1 className="business-title">
                {q?.trim()
                  ? `Resultados para "${q.trim()}"`
                  : categoryName}
              </h1>

              <p className="muted">
                {businesses?.length ?? 0} negocio
                {(businesses?.length ?? 0) === 1 ? "" : "s"} encontrado
                {(businesses?.length ?? 0) === 1 ? "" : "s"}.
              </p>
            </div>

            <Link href="/" className="btn">
              Volver
            </Link>
          </div>

          {businesses && businesses.length > 0 ? (
            <div className="cards">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={{
                    slug: business.slug,
                    name: business.name,
                    description: business.description ?? "",
                    address: business.address ?? "",
                    city: business.city ?? "",
                    phone: business.phone ?? "",
                    website: business.website ?? "",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="panel">
              <h3>No hemos encontrado negocios</h3>

              <p className="muted">
                Prueba otra categoría o realiza una búsqueda diferente.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}