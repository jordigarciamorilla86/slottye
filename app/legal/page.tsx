import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Aviso legal",
  robots: {
    index: true,
    follow: true,
  },
};

export default function LegalPageRoute() {
  return (
    <LegalPage
      kicker="Información legal"
      title="Aviso legal"
    >
      <h2>1. Titular del sitio web</h2>

      <p>
        En cumplimiento de la normativa aplicable a los
        servicios de la sociedad de la información, se
        informa de que el titular de Slottye es:
      </p>

      <ul>
        <li>
          <strong>Titular:</strong> [NOMBRE Y APELLIDOS]
        </li>

        <li>
          <strong>NIF:</strong> [NIF]
        </li>

        <li>
          <strong>Domicilio:</strong> [DOMICILIO]
        </li>

        <li>
          <strong>Email:</strong> [EMAIL DE CONTACTO]
        </li>
      </ul>

      <h2>2. Objeto</h2>

      <p>
        Slottye es una plataforma que permite a los usuarios
        localizar negocios y profesionales, consultar la
        disponibilidad publicada por estos y gestionar
        reservas de citas.
      </p>

      <p>
        Los negocios que utilizan Slottye son responsables
        de la información, servicios, precios,
        disponibilidad y demás contenidos correspondientes
        a su actividad profesional.
      </p>

      <h2>3. Uso de la plataforma</h2>

      <p>
        El usuario se compromete a utilizar Slottye de forma
        lícita y a no realizar actividades que puedan dañar,
        impedir o dificultar el funcionamiento normal de la
        plataforma.
      </p>

      <h2>4. Información de terceros</h2>

      <p>
        Slottye puede mostrar información proporcionada por
        los propios negocios o procedente de servicios de
        terceros utilizados para complementar las fichas de
        los establecimientos.
      </p>

      <h2>5. Enlaces externos</h2>

      <p>
        Slottye puede incluir enlaces a sitios web de
        terceros. Slottye no controla dichos sitios ni es
        responsable de sus contenidos, disponibilidad o
        políticas de privacidad.
      </p>

      <h2>6. Propiedad intelectual</h2>

      <p>
        El diseño, software, marca, logotipo y contenidos
        propios de Slottye están protegidos por la normativa
        aplicable en materia de propiedad intelectual e
        industrial.
      </p>

      <h2>7. Legislación aplicable</h2>

      <p>
        El presente sitio web se rige por la legislación
        española, sin perjuicio de los derechos que la
        normativa aplicable reconozca a consumidores y
        usuarios.
      </p>
    </LegalPage>
  );
}