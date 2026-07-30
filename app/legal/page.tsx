import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Aviso legal",
  description:
    "Información legal sobre el titular y las condiciones generales de acceso a Slottye.",
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
      <p className="muted">
        Última actualización: 30 de julio de 2026
      </p>

      {/* ======================================================
          1. TITULAR
          ====================================================== */}

      <h2>
        1. Titular del sitio web
      </h2>

      <p>
        En cumplimiento de la normativa aplicable a los
        servicios de la sociedad de la información, se
        informa de que el titular de Slottye es:
      </p>

      <ul>
        <li>
          <strong>Titular:</strong>{" "}
          Jorge Garcia Morilla
        </li>

        <li>
          <strong>NIF:</strong>{" "}
          38871856Q
        </li>

        <li>
          <strong>Domicilio:</strong>{" "}
          C/Hospital 26-30, 3-1,
          08301 Mataró (Barcelona)
        </li>

        <li>
          <strong>
            Correo electrónico:
          </strong>{" "}
          <a href="mailto:contacto@slottye.com">
            contacto@slottye.com
          </a>
        </li>

        <li>
          <strong>Sitio web:</strong>{" "}
          https://slottye.com
        </li>
      </ul>

      {/* ======================================================
          2. OBJETO
          ====================================================== */}

      <h2>
        2. Objeto de Slottye
      </h2>

      <p>
        Slottye es una plataforma tecnológica que permite
        a los usuarios localizar negocios y profesionales,
        consultar la información y disponibilidad publicada
        por estos y gestionar reservas de citas.
      </p>

      <p>
        Asimismo, Slottye permite a negocios y
        profesionales crear y gestionar una ficha pública,
        publicar servicios, horarios y disponibilidad,
        gestionar reservas y utilizar otras herramientas
        relacionadas con su actividad dentro de la
        plataforma.
      </p>

      {/* ======================================================
          3. INTERMEDIACIÓN
          ====================================================== */}

      <h2>
        3. Papel de Slottye
      </h2>

      <p>
        Slottye proporciona una herramienta tecnológica
        para facilitar el contacto y la gestión de reservas
        entre usuarios y negocios o profesionales.
      </p>

      <p>
        Salvo que se indique expresamente lo contrario,
        Slottye no presta materialmente los servicios
        profesionales reservados a través de la
        plataforma.
      </p>

      <p>
        La relación correspondiente a la prestación del
        servicio reservado se establece entre el usuario y
        el negocio o profesional seleccionado.
      </p>

      {/* ======================================================
          4. RESPONSABILIDAD DE NEGOCIOS
          ====================================================== */}

      <h2>
        4. Responsabilidad de los negocios
      </h2>

      <p>
        Los negocios y profesionales que utilizan Slottye
        son responsables de que la información publicada en
        sus fichas sea correcta, actualizada y conforme con
        la legislación aplicable.
      </p>

      <p>
        Esto incluye, entre otros aspectos:
      </p>

      <ul>
        <li>
          Nombre y datos identificativos del negocio.
        </li>

        <li>
          Dirección y datos de contacto.
        </li>

        <li>
          Servicios ofrecidos.
        </li>

        <li>
          Precios, cuando se publiquen.
        </li>

        <li>
          Horarios y disponibilidad.
        </li>

        <li>
          Condiciones de cancelación o modificación.
        </li>

        <li>
          Imágenes y demás contenidos incorporados a la
          ficha.
        </li>

        <li>
          Cumplimiento de las obligaciones legales,
          profesionales, fiscales, administrativas o
          sanitarias que correspondan a su actividad.
        </li>
      </ul>

      {/* ======================================================
          5. USO
          ====================================================== */}

      <h2>
        5. Uso de la plataforma
      </h2>

      <p>
        El usuario se compromete a utilizar Slottye de
        forma lícita, diligente y conforme a estas
        condiciones, la legislación aplicable y los
        derechos de terceros.
      </p>

      <p>
        Queda prohibido utilizar Slottye para realizar
        actividades fraudulentas, introducir información
        falsa de forma intencionada, intentar acceder a
        cuentas o sistemas ajenos, alterar el funcionamiento
        de la plataforma o utilizarla de cualquier otra
        forma ilícita o abusiva.
      </p>

      {/* ======================================================
          6. CUENTAS
          ====================================================== */}

      <h2>
        6. Cuentas de usuario
      </h2>

      <p>
        Algunas funcionalidades requieren la creación de
        una cuenta.
      </p>

      <p>
        Cada usuario es responsable de mantener la
        confidencialidad de sus credenciales y de comunicar
        cualquier uso no autorizado de su cuenta cuando
        tenga conocimiento de él.
      </p>

      <p>
        Slottye podrá adoptar medidas de seguridad,
        limitar temporalmente determinadas funcionalidades
        o suspender cuentas cuando existan indicios
        razonables de fraude, abuso, incumplimiento de las
        condiciones o riesgo para la seguridad de la
        plataforma o de terceros.
      </p>

      {/* ======================================================
          7. RESERVAS
          ====================================================== */}

      <h2>
        7. Reservas
      </h2>

      <p>
        Slottye permite consultar los horarios que los
        negocios ponen a disposición de los usuarios y
        solicitar o gestionar reservas.
      </p>

      <p>
        La disponibilidad mostrada depende de la
        información gestionada por cada negocio y de las
        reservas realizadas a través de la plataforma.
      </p>

      <p>
        Una reserva podrá modificarse o cancelarse en los
        supuestos y condiciones disponibles en Slottye o
        establecidos por el negocio correspondiente.
      </p>

      <p>
        Si un negocio elimina su cuenta o deja de estar
        disponible en Slottye, las reservas futuras
        asociadas podrán cancelarse y los usuarios afectados
        podrán recibir una comunicación informativa.
      </p>

      {/* ======================================================
          8. RESEÑAS
          ====================================================== */}

      <h2>
        8. Reseñas y contenidos de usuarios
      </h2>

      <p>
        Los usuarios podrán publicar reseñas y valoraciones
        cuando las funcionalidades de Slottye lo permitan.
      </p>

      <p>
        Las reseñas deberán basarse en experiencias reales
        y no podrán contener contenido ilícito,
        discriminatorio, amenazante, difamatorio,
        fraudulento, publicitario, ofensivo o que vulnere
        derechos de terceros.
      </p>

      <p>
        Slottye podrá retirar o limitar la visibilidad de
        contenidos que incumplan estas condiciones o cuando
        exista una obligación legal para hacerlo.
      </p>

      {/* ======================================================
          9. TERCEROS
          ====================================================== */}

      <h2>
        9. Información y servicios de terceros
      </h2>

      <p>
        Slottye puede utilizar o mostrar información
        procedente de servicios de terceros para completar
        determinadas funcionalidades, como mapas,
        geolocalización, datos de lugares, autenticación o
        servicios tecnológicos.
      </p>

      <p>
        El uso de dichos servicios puede estar sujeto a
        sus propias condiciones y políticas.
      </p>

      {/* ======================================================
          10. ENLACES
          ====================================================== */}

      <h2>
        10. Enlaces externos
      </h2>

      <p>
        Slottye puede incluir enlaces a páginas web o
        servicios gestionados por terceros.
      </p>

      <p>
        Slottye no controla estos sitios externos y no
        responde de sus contenidos, disponibilidad,
        seguridad, condiciones de uso o políticas de
        privacidad.
      </p>

      {/* ======================================================
          11. PROPIEDAD INTELECTUAL
          ====================================================== */}

      <h2>
        11. Propiedad intelectual e industrial
      </h2>

      <p>
        El software, diseño, estructura, elementos
        gráficos, marca, logotipo y contenidos propios de
        Slottye están protegidos por la normativa aplicable
        en materia de propiedad intelectual e industrial.
      </p>

      <p>
        No se concede al usuario ningún derecho de
        propiedad sobre dichos elementos por el mero uso de
        la plataforma.
      </p>

      <p>
        Los contenidos incorporados por los negocios o
        usuarios seguirán perteneciendo a sus respectivos
        titulares, quienes deberán disponer de los derechos
        necesarios para publicarlos en Slottye.
      </p>

      {/* ======================================================
          12. DISPONIBILIDAD
          ====================================================== */}

      <h2>
        12. Disponibilidad del servicio
      </h2>

      <p>
        Slottye procura mantener la plataforma disponible y
        en correcto funcionamiento, pero no puede garantizar
        que el servicio funcione de forma ininterrumpida o
        libre de errores en todo momento.
      </p>

      <p>
        Pueden producirse interrupciones temporales por
        mantenimiento, actualizaciones, incidencias
        técnicas, problemas de proveedores externos,
        comunicaciones o circunstancias fuera del control
        razonable de Slottye.
      </p>

      {/* ======================================================
          13. RESPONSABILIDAD
          ====================================================== */}

      <h2>
        13. Responsabilidad
      </h2>

      <p>
        Slottye responderá en los términos establecidos por
        la legislación aplicable.
      </p>

      <p>
        Dentro de los límites permitidos legalmente,
        Slottye no será responsable de incumplimientos,
        actuaciones, calidad del servicio, errores,
        retrasos o daños directamente imputables a los
        negocios o profesionales que prestan materialmente
        los servicios reservados.
      </p>

      <p>
        Tampoco podrá garantizar la exactitud permanente de
        información que dependa exclusivamente de terceros
        o haya sido publicada directamente por los negocios,
        aunque podrá adoptar medidas razonables cuando se
        comunique información manifiestamente incorrecta o
        ilícita.
      </p>

      {/* ======================================================
          14. SEGURIDAD
          ====================================================== */}

      <h2>
        14. Seguridad
      </h2>

      <p>
        Slottye aplica medidas técnicas y organizativas
        destinadas a proteger la plataforma, las cuentas y
        la información gestionada a través del servicio.
      </p>

      <p>
        No obstante, ningún sistema conectado a Internet
        puede considerarse completamente inmune a
        incidencias de seguridad.
      </p>

      {/* ======================================================
          15. PRIVACIDAD
          ====================================================== */}

      <h2>
        15. Protección de datos
      </h2>

      <p>
        El tratamiento de datos personales realizado a
        través de Slottye se regula en la{" "}
        <a href="/privacy">
          Política de privacidad
        </a>
        .
      </p>

      <p>
        Las tecnologías de almacenamiento o recuperación de
        información utilizadas se describen en la{" "}
        <a href="/cookies">
          Política de cookies
        </a>
        .
      </p>

      {/* ======================================================
          16. MODIFICACIONES
          ====================================================== */}

      <h2>
        16. Modificaciones
      </h2>

      <p>
        Slottye podrá actualizar este Aviso legal cuando
        resulte necesario para adaptarlo a cambios en la
        plataforma, en su funcionamiento o en la normativa
        aplicable.
      </p>

      {/* ======================================================
          17. LEY
          ====================================================== */}

      <h2>
        17. Legislación aplicable
      </h2>

      <p>
        Este sitio web y su utilización se rigen por la
        legislación española.
      </p>

      <p>
        Lo anterior se entiende sin perjuicio de los
        derechos imperativos que correspondan a
        consumidores y usuarios conforme a la normativa
        que resulte aplicable en cada caso.
      </p>

      {/* ======================================================
          18. CONTACTO
          ====================================================== */}

      <h2>
        18. Contacto
      </h2>

      <p>
        Para consultas generales relacionadas con Slottye
        puedes escribir a:
      </p>

      <p>
        <a href="mailto:contacto@slottye.com">
          <strong>
            contacto@slottye.com
          </strong>
        </a>
      </p>
    </LegalPage>
  );
}