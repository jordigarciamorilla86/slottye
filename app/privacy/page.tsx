import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Tu privacidad"
      title="Política de privacidad"
    >
      <h2>1. Responsable del tratamiento</h2>

      <ul>
        <li>
          <strong>Responsable:</strong> [NOMBRE Y APELLIDOS]
        </li>

        <li>
          <strong>NIF:</strong> [NIF]
        </li>

        <li>
          <strong>Email:</strong> [EMAIL DE PRIVACIDAD]
        </li>
      </ul>

      <h2>2. Datos tratados</h2>

      <p>
        Dependiendo del uso que realices de Slottye,
        podemos tratar datos como:
      </p>

      <ul>
        <li>Nombre.</li>
        <li>Dirección de correo electrónico.</li>
        <li>Información asociada a tu cuenta.</li>
        <li>Reservas y citas realizadas.</li>
        <li>Negocios favoritos y suscripciones.</li>
        <li>Reseñas y valoraciones.</li>
        <li>
          Información necesaria para el funcionamiento y
          seguridad de la plataforma.
        </li>
      </ul>

      <p>
        Si utilizas voluntariamente la función de negocios
        cercanos, el navegador puede solicitar acceso a tu
        ubicación. Esta función se utiliza para calcular la
        distancia respecto de los negocios mostrados.
      </p>

      <h2>3. Finalidades</h2>

      <p>
        Los datos pueden tratarse para:
      </p>

      <ul>
        <li>Crear y gestionar tu cuenta.</li>
        <li>Gestionar reservas y citas.</li>
        <li>
          Gestionar negocios favoritos y suscripciones.
        </li>
        <li>
          Enviar comunicaciones relacionadas con tus
          reservas.
        </li>
        <li>
          Avisarte de disponibilidad cuando hayas solicitado
          recibir dichos avisos.
        </li>
        <li>Gestionar reseñas y valoraciones.</li>
        <li>
          Mantener la seguridad y correcto funcionamiento de
          Slottye.
        </li>
      </ul>

      <h2>4. Base jurídica</h2>

      <p>
        Dependiendo del tratamiento, la base jurídica podrá
        ser la ejecución de la relación derivada del uso de
        Slottye, el cumplimiento de obligaciones legales, el
        interés legítimo cuando resulte aplicable o el
        consentimiento del usuario cuando este sea
        necesario.
      </p>

      <h2>5. Comunicaciones</h2>

      <p>
        Slottye puede enviar comunicaciones necesarias para
        prestar el servicio, como confirmaciones,
        cancelaciones o cambios relacionados con una
        reserva.
      </p>

      <p>
        Los avisos opcionales de disponibilidad se enviarán
        cuando el usuario se haya suscrito a un negocio y
        tenga habilitados dichos avisos.
      </p>

      <h2>6. Proveedores</h2>

      <p>
        Para prestar sus servicios, Slottye puede utilizar
        proveedores tecnológicos que traten determinados
        datos por cuenta de Slottye, por ejemplo servicios
        de infraestructura, autenticación, base de datos,
        correo electrónico o mapas.
      </p>

      <h2>7. Conservación</h2>

      <p>
        Los datos se conservarán mientras sean necesarios
        para prestar el servicio y durante los plazos
        adicionales que resulten necesarios para cumplir
        obligaciones legales o atender posibles
        responsabilidades.
      </p>

      <h2>8. Analítica de uso</h2>

<p>
  Slottye utiliza Vercel Web Analytics para obtener
  estadísticas agregadas sobre el uso de la plataforma,
  como páginas visitadas, procedencia aproximada del
  tráfico, navegador o tipo de dispositivo.
</p>

<p>
  Esta herramienta está diseñada para ofrecer métricas
  respetuosas con la privacidad y no utiliza cookies para
  realizar seguimiento de los usuarios entre diferentes
  sitios web.
</p>

<p>
  Estos datos se utilizan para conocer el funcionamiento
  general de Slottye, detectar mejoras y optimizar la
  experiencia de los usuarios.
</p>


      <h2>9. Derechos</h2>

      <p>
        Puedes ejercer, cuando correspondan, tus derechos de
        acceso, rectificación, supresión, oposición,
        limitación del tratamiento y portabilidad enviando
        una solicitud a [EMAIL DE PRIVACIDAD].
      </p>

      <p>
        También tienes derecho a presentar una reclamación
        ante la Agencia Española de Protección de Datos si
        consideras que el tratamiento de tus datos no se
        ajusta a la normativa.
      </p>

      <h2>10. Seguridad</h2>

      <p>
        Slottye aplica medidas técnicas y organizativas
        destinadas a proteger la información y limitar el
        acceso a los datos personales.
      </p>

      <h2>11. Cambios en esta política</h2>

      <p>
        Esta política podrá actualizarse para reflejar
        cambios en Slottye o en la normativa aplicable.
      </p>
    </LegalPage>
  );
}