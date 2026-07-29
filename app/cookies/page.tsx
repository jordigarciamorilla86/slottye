import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de cookies",
};

export default function CookiesPage() {
  return (
    <LegalPage
      kicker="Privacidad"
      title="Política de cookies"
    >
      <h2>1. ¿Qué son las cookies?</h2>

      <p>
        Las cookies y tecnologías similares permiten
        almacenar o recuperar información en el dispositivo
        del usuario cuando utiliza un sitio web.
      </p>

      <h2>2. Cookies utilizadas por Slottye</h2>

      <p>
        Slottye utiliza las tecnologías técnicas necesarias
        para permitir el funcionamiento de la plataforma,
        incluyendo aquellas necesarias para mantener la
        sesión del usuario, proporcionar autenticación,
        seguridad y otras funciones solicitadas por el
        usuario.
      </p>

      <h2>3. Cookies técnicas</h2>

      <p>
        Las cookies estrictamente necesarias permiten
        utilizar funciones esenciales de Slottye y no
        requieren consentimiento cuando se utilizan
        exclusivamente para estas finalidades.
      </p>

      <h2>4. Cookies no necesarias</h2>

      <p>
        En caso de que Slottye incorpore en el futuro
        cookies analíticas, publicitarias u otras tecnologías
        que requieran consentimiento, estas no se utilizarán
        antes de que el usuario haya podido aceptar o
        rechazar su utilización cuando legalmente resulte
        necesario.
      </p>

      <h2>5. Servicios de terceros</h2>

      <p>
        Determinadas funcionalidades pueden depender de
        proveedores externos. Cuando dichas funcionalidades
        impliquen el uso de cookies o tecnologías sujetas a
        consentimiento, se aplicarán los mecanismos
        correspondientes antes de activarlas.
      </p>

      <h2>6. Actualizaciones</h2>

      <p>
        Esta política se actualizará cuando cambien las
        tecnologías utilizadas por Slottye o resulte
        necesario por cambios normativos.
      </p>
    </LegalPage>
  );
}