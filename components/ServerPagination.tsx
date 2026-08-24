import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  pathname: string;
};

export function ServerPagination({
  currentPage,
  totalPages,
  pathname,
}: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  return (
    <nav
      aria-label="Paginación"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 24,
        flexWrap: "wrap",
      }}
    >
      {currentPage > 1 && (
        <Link className="btn" href={`${pathname}?page=${currentPage - 1}`}>
          Anterior
        </Link>
      )}

      {pages.map((page, index) => {
        const previousPage = pages[index - 1];

        return (
          <span key={page} style={{ display: "contents" }}>
            {previousPage && page - previousPage > 1 && (
              <span className="muted" aria-hidden="true">
                …
              </span>
            )}

            <Link
              className={page === currentPage ? "btn primary" : "btn"}
              href={`${pathname}?page=${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              aria-label={`Página ${page}`}
            >
              {page}
            </Link>
          </span>
        );
      })}

      {currentPage < totalPages && (
        <Link className="btn" href={`${pathname}?page=${currentPage + 1}`}>
          Siguiente
        </Link>
      )}
    </nav>
  );
}
