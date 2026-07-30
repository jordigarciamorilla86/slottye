import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Información sobre las cookies y tecnologías utilizadas por Slottye.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      kicker="Privacidad"
      title="Política de cookies"
    >
      <p className="muted">
        Última actualización: 30 de julio de 2026
      </p>

      {/* ======================================================
          1. QUÉ SON
          ====================================================== */}

      <h2>
        1. ¿Qué son las cookies?
      </h2>

      <p>
        Las cookies son pequeños archivos o tecnologías
        similares que pueden almacenarse en el dispositivo
        del usuario cuando visita una página web.
      </p>

      <p>
        Estas tecnologías pueden utilizarse, entre otras
        finalidades, para permitir el funcionamiento de una
        página, mantener una sesión iniciada, recordar
        determinadas preferencias o analizar el uso de un
        servicio.
      </p>

      {/* ======================================================
          2. QUÉ USA SLOTTYE
          ====================================================== */}

      <h2>
        2. Qué tecnologías utiliza Slottye
      </h2>

      <p>
        Slottye utiliza las tecnologías estrictamente
        necesarias para prestar las funcionalidades
        solicitadas por el usuario, especialmente aquellas
        relacionadas con la autenticación, la seguridad y
        el mantenimiento de la sesión.
      </p>

      <p>
        Actualmente Slottye también utiliza Vercel Web
        Analytics para obtener estadísticas agregadas sobre
        el funcionamiento y uso general de la plataforma.
      </p>

      {/* ======================================================
          3. COOKIES TÉCNICAS
          ====================================================== */}

      <h2>
        3. Cookies y tecnologías estrictamente necesarias
      </h2>

      <p>
        Slottye puede utilizar cookies o mecanismos
        equivalentes que resulten necesarios para funciones
        esenciales de la plataforma.
      </p>

      <p>
        Estas tecnologías pueden ser necesarias, por
        ejemplo, para:
      </p>

      <ul>
        <li>
          Mantener la sesión de un usuario autenticado.
        </li>

        <li>
          Gestionar el acceso seguro a la cuenta.
        </li>

        <li>
          Completar procesos de autenticación.
        </li>

        <li>
          Mantener mecanismos destinados a proteger la
          seguridad de la plataforma.
        </li>

        <li>
          Permitir funcionalidades solicitadas
          expresamente por el usuario.
        </li>
      </ul>

      <p>
        Estas tecnologías se utilizan únicamente cuando
        resultan necesarias para prestar el servicio o
        ejecutar funcionalidades solicitadas por el
        usuario.
      </p>

      {/* ======================================================
          4. SUPABASE
          ====================================================== */}

      <h2>
        4. Autenticación y Supabase
      </h2>

      <p>
        Slottye utiliza Supabase para determinadas
        funciones relacionadas con autenticación,
        sesiones, base de datos y seguridad.
      </p>

      <p>
        Como parte del proceso de autenticación pueden
        utilizarse cookies u otros mecanismos técnicos
        necesarios para mantener la sesión del usuario de
        forma segura.
      </p>

      <p>
        Estas tecnologías son necesarias para que las
        funciones de cuenta e inicio de sesión puedan
        operar correctamente.
      </p>

      {/* ======================================================
          5. VERCEL ANALYTICS
          ====================================================== */}

      <h2>
        5. Vercel Web Analytics
      </h2>

      <p>
        Slottye utiliza Vercel Web Analytics para obtener
        información estadística agregada sobre el uso de la
        plataforma.
      </p>

      <p>
        Esta herramienta permite conocer, entre otros
        aspectos, páginas visitadas, procedencia aproximada
        del tráfico, navegador, sistema operativo,
        dispositivo u otras métricas generales de uso.
      </p>

      <p>
        Vercel Web Analytics está diseñado para realizar
        mediciones respetuosas con la privacidad y no
        depende de cookies tradicionales para identificar
        visitantes entre diferentes sitios web.
      </p>

      <p>
        La información obtenida se utiliza para conocer el
        funcionamiento de Slottye, detectar incidencias,
        conocer el uso general de sus funcionalidades y
        mejorar la experiencia ofrecida.
      </p>

      {/* ======================================================
          6. GOOGLE
          ====================================================== */}

      <h2>
        6. Servicios de Google
      </h2>

      <p>
        Slottye utiliza determinados servicios de Google,
        como el inicio de sesión mediante Google y
        funcionalidades relacionadas con mapas o
        información de lugares.
      </p>

      <p>
        Cuando el usuario decide utilizar el inicio de
        sesión con Google, el proceso puede implicar
        tecnologías gestionadas directamente por Google en
        sus propios dominios y conforme a sus políticas.
      </p>

      <p>
        Del mismo modo, determinadas funcionalidades
        externas pueden estar sujetas a las condiciones y
        políticas de privacidad del proveedor
        correspondiente.
      </p>

      {/* ======================================================
          7. GEOLOCALIZACIÓN
          ====================================================== */}

      <h2>
        7. Geolocalización
      </h2>

      <p>
        La función de negocios cercanos puede solicitar
        acceso a la ubicación mediante los mecanismos
        proporcionados por el navegador o dispositivo.
      </p>

      <p>
        El acceso a la ubicación no depende de una cookie y
        solo se produce cuando el usuario concede
        voluntariamente el permiso correspondiente.
      </p>

      <p>
        El permiso puede modificarse o retirarse desde la
        configuración del navegador o del dispositivo.
      </p>

      {/* ======================================================
          8. COOKIES NO NECESARIAS
          ====================================================== */}

      <h2>
        8. Cookies no necesarias
      </h2>

      <p>
        Actualmente Slottye no pretende utilizar cookies
        publicitarias ni tecnologías destinadas a realizar
        seguimiento comercial de los usuarios entre
        diferentes sitios web.
      </p>

      <p>
        Si en el futuro se incorporan cookies analíticas,
        publicitarias, de personalización u otras
        tecnologías que requieran consentimiento conforme a
        la normativa aplicable, no se activarán antes de que
        el usuario pueda aceptar, rechazar o configurar su
        utilización cuando resulte legalmente necesario.
      </p>

      {/* ======================================================
          9. GESTIÓN DESDE EL NAVEGADOR
          ====================================================== */}

      <h2>
        9. Gestión de cookies desde el navegador
      </h2>

      <p>
        Los principales navegadores permiten consultar,
        bloquear o eliminar cookies desde sus opciones de
        configuración.
      </p>

      <p>
        Debes tener en cuenta que bloquear o eliminar
        determinadas cookies técnicas puede impedir el
        funcionamiento correcto de algunas funcionalidades,
        especialmente las relacionadas con inicio de sesión
        y gestión de cuenta.
      </p>

      {/* ======================================================
          10. CAMBIOS
          ====================================================== */}

      <h2>
        10. Cambios en esta política
      </h2>

      <p>
        Esta Política de cookies podrá actualizarse cuando
        cambien las tecnologías utilizadas por Slottye, los
        proveedores empleados o la normativa aplicable.
      </p>

      <p>
        Cuando se incorporen tecnologías que requieran
        consentimiento, se implementarán los mecanismos
        necesarios para permitir al usuario gestionar sus
        preferencias.
      </p>

      {/* ======================================================
          11. CONTACTO
          ====================================================== */}

      <h2>
        11. Contacto
      </h2>

      <p>
        Para cualquier consulta relacionada con privacidad
        o el uso de cookies puedes escribir a:
      </p>

      <p>
        <a href="mailto:privacidad@slottye.com">
          <strong>
            privacidad@slottye.com
          </strong>
        </a>
      </p>

      <p>
        Puedes consultar información adicional sobre el
        tratamiento de datos personales en nuestra{" "}
        <a href="/privacy">
          Política de privacidad
        </a>
        .
      </p>
    </LegalPage>
  );
}