import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Información sobre el tratamiento de datos personales en Slottye.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Tu privacidad"
      title="Política de privacidad"
    >
      <p className="muted">
        Última actualización: 11 de agosto de 2026
      </p>

      {/* ======================================================
          1. RESPONSABLE
          ====================================================== */}

      <h2>
        1. Responsable del tratamiento
      </h2>

      <p>
        El responsable del tratamiento de los datos
        personales tratados a través de Slottye es:
      </p>

      <ul>
        <li>
          <strong>
            Responsable:
          </strong>{" "}
          Jorge Garcia Morilla
        </li>

        <li>
          <strong>NIF:</strong>{" "}
          38871856Q
        </li>

        <li>
          <strong>
            Domicilio:
          </strong>{" "}
          C/Hospital 26-30, 3-1,
          08301 Mataró (Barcelona)
        </li>

        <li>
          <strong>
            Email de privacidad:
          </strong>{" "}
          <a href="mailto:privacidad@slottye.com">
            privacidad@slottye.com
          </a>
        </li>

        <li>
          <strong>
            Email de contacto:
          </strong>{" "}
          <a href="mailto:contacto@slottye.com">
            contacto@slottye.com
          </a>
        </li>
      </ul>

      {/* ======================================================
          2. QUÉ ES SLOTTYE
          ====================================================== */}

      <h2>
        2. Qué es Slottye
      </h2>

      <p>
        Slottye es una plataforma online que permite a
        usuarios localizar negocios y profesionales,
        consultar sus servicios y disponibilidad y realizar
        o gestionar reservas.
      </p>

      <p>
        La plataforma también permite a los negocios
        publicar y gestionar su ficha, servicios, horarios,
        disponibilidad y reservas recibidas.
      </p>

      {/* ======================================================
          3. DATOS TRATADOS
          ====================================================== */}

      <h2>
        3. Datos personales que podemos tratar
      </h2>

      <p>
        Los datos tratados dependerán del uso que realices
        de Slottye.
      </p>

      <h3>
        Datos de cuenta
      </h3>

      <ul>
        <li>
          Nombre o nombre identificativo.
        </li>

        <li>
          Dirección de correo electrónico.
        </li>

        <li>
          Identificador interno de usuario.
        </li>

        <li>
          Tipo de cuenta, por ejemplo cliente o negocio.
        </li>

        <li>
          Información necesaria para gestionar la
          autenticación y seguridad de la cuenta.
        </li>
      </ul>

      <h3>
        Datos relacionados con reservas
      </h3>

      <ul>
        <li>
          Negocio en el que se realiza la reserva.
        </li>

        <li>
          Servicio reservado.
        </li>

        <li>
          Fecha y hora de la cita.
        </li>

        <li>
          Estado de la reserva.
        </li>

        <li>
          Información relacionada con cancelaciones,
          reprogramaciones o incidencias de la reserva.
        </li>
      </ul>

      <h3>
        Datos relacionados con el uso de Slottye
      </h3>

      <ul>
        <li>
          Negocios marcados como favoritos.
        </li>

        <li>
          Suscripciones a negocios o avisos de
          disponibilidad.
        </li>

        <li>
          Reseñas y valoraciones publicadas.
        </li>

        <li>
          Notificaciones relacionadas con el servicio.
        </li>
      </ul>

      <h3>
        Datos de negocios y profesionales
      </h3>

      <p>
        Cuando se utiliza una cuenta de negocio, podremos
        tratar además información relacionada con la
        actividad publicada en Slottye, como:
      </p>

      <ul>
        <li>
          Nombre del negocio.
        </li>

        <li>
          Nombre del responsable de la cuenta.
        </li>

        <li>
          Dirección y localidad.
        </li>

        <li>
          Teléfono y correo electrónico.
        </li>

        <li>
          Página web.
        </li>

        <li>
          Servicios ofrecidos.
        </li>

        <li>
          Horarios y disponibilidad.
        </li>

        <li>
          Imágenes y contenido de la ficha.
        </li>
      </ul>

     {/* ======================================================
    4. GOOGLE
    ====================================================== */}

<h2>
  4. Servicios de Google y Google Calendar
</h2>

<h3>
  Inicio de sesión con Google
</h3>

<p>
  Slottye permite crear una cuenta o iniciar sesión
  mediante Google.
</p>

<p>
  Cuando utilizas esta opción, Google proporciona a
  Slottye los datos necesarios para identificar tu
  cuenta, como tu dirección de correo electrónico y
  los datos básicos de perfil que hayas autorizado
  durante el proceso de autenticación.
</p>

<p>
  Slottye no recibe ni almacena la contraseña de tu
  cuenta de Google.
</p>

<h3>
  Integración con Google Calendar
</h3>

<p>
  Las cuentas de negocio pueden conectar
  voluntariamente Google Calendar con Slottye para
  sincronizar su agenda.
</p>

<p>
  Cuando un negocio activa esta integración, Slottye
  puede acceder a los eventos del calendario
  autorizado en la medida necesaria para detectar
  periodos ocupados y mantener sincronizada la agenda
  del negocio.
</p>

<p>
  La integración también puede crear, actualizar o
  eliminar eventos de Google Calendar cuando sea
  necesario para reflejar reservas, modificaciones,
  cancelaciones u otros cambios realizados en la
  agenda de Slottye.
</p>

<p>
  Asimismo, los cambios realizados por el usuario en
  los eventos sincronizados de Google Calendar pueden
  reflejarse en Slottye para mantener ambas agendas
  coordinadas.
</p>

<p>
  Para mantener activa esta funcionalidad, Slottye
  puede almacenar de forma segura las credenciales o
  tokens de autorización proporcionados durante el
  proceso OAuth de Google, así como identificadores
  técnicos del calendario y de los eventos
  sincronizados.
</p>

<p>
  La conexión con Google Calendar es opcional y puede
  desconectarse desde Slottye. Los datos obtenidos a
  través de Google Calendar se utilizan exclusivamente
  para proporcionar la funcionalidad de sincronización
  solicitada por el usuario y no con fines
  publicitarios.
</p>

      {/* ======================================================
          5. GEOLOCALIZACIÓN
          ====================================================== */}

      <h2>
        5. Ubicación y negocios cercanos
      </h2>

      <p>
        Slottye puede solicitar voluntariamente permiso al
        navegador o dispositivo para acceder a tu ubicación
        cuando utilizas funcionalidades relacionadas con
        negocios cercanos.
      </p>

      <p>
        Esta información se utiliza para calcular la
        distancia entre tu ubicación y los negocios
        disponibles y ofrecer resultados relevantes según
        la zona en la que te encuentres.
      </p>

      <p>
        El acceso a la ubicación depende siempre de la
        autorización otorgada desde tu navegador o
        dispositivo y puede desactivarse desde sus ajustes.
      </p>

      {/* ======================================================
          6. FINALIDADES
          ====================================================== */}

      <h2>
        6. Para qué utilizamos tus datos
      </h2>

      <p>
        Podemos tratar tus datos personales para las
        siguientes finalidades:
      </p>

      <ul>
        <li>
          Crear, autenticar y gestionar tu cuenta de
          Slottye.
        </li>

        <li>
          Permitir el inicio de sesión mediante correo
          electrónico o proveedores de autenticación como
          Google.
        </li>

        <li>
          Gestionar reservas, cancelaciones y
          reprogramaciones.
        </li>

        <li>
          Facilitar al negocio correspondiente la
          información necesaria para gestionar una reserva.
        </li>

        <li>
          Gestionar negocios favoritos y suscripciones.
        </li>

        <li>
          Enviar avisos relacionados con reservas.
        </li>

        <li>
          Avisar de nuevas citas o citas que vuelvan a
          estar disponibles cuando hayas solicitado recibir
          este tipo de comunicaciones.
        </li>

        <li>
          Gestionar reseñas y valoraciones.
        </li>

        <li>
          Gestionar las fichas, servicios, horarios y
          disponibilidad de los negocios.
        </li>

        <li>
  Sincronizar, cuando el negocio active
  voluntariamente la integración, la agenda de
  Slottye con Google Calendar, incluyendo la consulta,
  creación, actualización y eliminación de eventos
  necesaria para mantener ambas agendas coordinadas.
</li>

        <li>
          Prevenir abusos, fraude y accesos no autorizados.
        </li>

        <li>
          Mantener la seguridad y correcto funcionamiento
          técnico de Slottye.
        </li>

        <li>
          Analizar de forma agregada el uso de la
          plataforma para detectar errores y mejorar el
          servicio.
        </li>

        <li>
          Atender consultas, solicitudes y ejercicio de
          derechos.
        </li>

        <li>
          Cumplir las obligaciones legales que resulten
          aplicables.
        </li>
      </ul>

      {/* ======================================================
          7. BASE JURÍDICA
          ====================================================== */}

      <h2>
        7. Base jurídica del tratamiento
      </h2>

      <p>
        La base jurídica dependerá de la finalidad concreta
        para la que se traten los datos.
      </p>

      <ul>
        <li>
          <strong>
            Ejecución de la relación contractual o
            precontractual:
          </strong>{" "}
          para crear y gestionar una cuenta, gestionar
          reservas y proporcionar las funcionalidades
          solicitadas por el usuario.
        </li>

        <li>
          <strong>
            Consentimiento:
          </strong>{" "}
          cuando el tratamiento dependa de una decisión
          voluntaria del usuario, como determinadas
          comunicaciones o el acceso a la ubicación del
          dispositivo.
        </li>

        <li>
          <strong>
            Interés legítimo:
          </strong>{" "}
          cuando resulte necesario para mantener la
          seguridad de Slottye, prevenir abusos, analizar
          incidencias o mejorar el funcionamiento de la
          plataforma, siempre que no prevalezcan los
          derechos e intereses del usuario.
        </li>

        <li>
          <strong>
            Cumplimiento de obligaciones legales:
          </strong>{" "}
          cuando sea necesario conservar o comunicar
          determinada información para cumplir la
          legislación aplicable.
        </li>
      </ul>

      {/* ======================================================
          8. COMUNICACIÓN A NEGOCIOS
          ====================================================== */}

      <h2>
        8. Información compartida con los negocios
      </h2>

      <p>
        Cuando realizas una reserva, determinada información
        necesaria para gestionar la cita puede ponerse a
        disposición del negocio o profesional con el que
        realizas la reserva.
      </p>

      <p>
        Esta información se limita a la necesaria para
        identificar y gestionar correctamente la cita y no
        autoriza al negocio a utilizar los datos para
        finalidades incompatibles con la prestación del
        servicio o con la normativa aplicable.
      </p>

      {/* ======================================================
          9. PROVEEDORES
          ====================================================== */}

      <h2>
        9. Proveedores tecnológicos
      </h2>

      <p>
        Para prestar el servicio, Slottye utiliza
        proveedores tecnológicos que pueden tratar
        determinados datos por cuenta de Slottye o en el
        marco de los servicios que proporcionan.
      </p>

      <p>
        Entre las categorías de proveedores utilizados se
        encuentran:
      </p>

      <ul>
        <li>
          Servicios de base de datos, almacenamiento y
          autenticación, como Supabase.
        </li>

        <li>
          Servicios de alojamiento, despliegue y analítica
          técnica, como Vercel.
        </li>

        <li>
          Servicios de envío de correo electrónico, como
          Resend.
        </li>

        <li>
  Servicios de mapas, información de lugares,
  autenticación e integración de calendarios, como
  los proporcionados por Google.
</li>

        <li>
          Servicios de infraestructura, DNS y
          encaminamiento de correo electrónico, como
          Cloudflare.
        </li>
      </ul>

      <p>
        Estos proveedores podrán acceder únicamente a los
        datos necesarios para prestar las funciones para
        las que hayan sido contratados o utilizados.
      </p>

      {/* ======================================================
          10. TRANSFERENCIAS INTERNACIONALES
          ====================================================== */}

      <h2>
        10. Transferencias internacionales de datos
      </h2>

      <p>
        Algunos de los proveedores tecnológicos utilizados
        por Slottye pueden prestar servicios o disponer de
        infraestructura fuera del Espacio Económico
        Europeo.
      </p>

      <p>
        Cuando un tratamiento implique una transferencia
        internacional de datos personales, esta deberá
        realizarse mediante alguno de los mecanismos
        admitidos por la normativa de protección de datos,
        como decisiones de adecuación, cláusulas
        contractuales tipo u otras garantías apropiadas que
        resulten aplicables.
      </p>

      {/* ======================================================
          11. EMAILS
          ====================================================== */}

      <h2>
        11. Comunicaciones por correo electrónico
      </h2>

      <p>
        Slottye puede enviarte comunicaciones necesarias
        para prestar y proteger el servicio, entre ellas:
      </p>

      <ul>
        <li>
          Confirmación de dirección de correo electrónico.
        </li>

        <li>
          Recuperación o modificación de contraseña.
        </li>

        <li>
          Avisos de seguridad relacionados con tu cuenta.
        </li>

        <li>
          Confirmaciones de reservas.
        </li>

        <li>
          Cancelaciones o cambios de citas.
        </li>

        <li>
          Comunicaciones necesarias cuando un negocio deje
          de estar disponible.
        </li>
      </ul>

      <p>
        También podremos enviarte avisos de disponibilidad
        cuando te hayas suscrito voluntariamente a un
        negocio y tengas habilitados dichos avisos.
      </p>

      {/* ======================================================
          12. ANALYTICS
          ====================================================== */}

      <h2>
        12. Analítica de uso
      </h2>

      <p>
        Slottye utiliza Vercel Web Analytics para obtener
        estadísticas agregadas sobre el uso de la
        plataforma, como páginas visitadas, procedencia
        aproximada del tráfico, navegador o tipo de
        dispositivo.
      </p>

      <p>
        Esta información se utiliza para conocer el
        funcionamiento general de Slottye, detectar
        incidencias y mejorar la experiencia de los
        usuarios.
      </p>

      {/* ======================================================
          13. CONSERVACIÓN
          ====================================================== */}

      <h2>
        13. Conservación de los datos
      </h2>

      <p>
        Los datos asociados a una cuenta se conservarán
        mientras esta permanezca activa y mientras sean
        necesarios para prestar los servicios solicitados.
      </p>

      <p>
        Cuando elimines tu cuenta, los datos asociados se
        eliminarán o dejarán de utilizarse para las
        finalidades ordinarias del servicio, sin perjuicio
        de que determinados datos puedan conservarse
        bloqueados durante los plazos exigidos por la ley o
        mientras puedan derivarse responsabilidades
        legales.
      </p>

      <p>
        Determinada información técnica o de seguridad
        podrá conservarse durante el tiempo razonablemente
        necesario para prevenir fraude, investigar
        incidencias o cumplir obligaciones legales.
      </p>

      {/* ======================================================
          14. ELIMINACIÓN DE CUENTA
          ====================================================== */}

      <h2>
        14. Eliminación de la cuenta
      </h2>

      <p>
        Los usuarios pueden solicitar la eliminación de su
        cuenta desde las opciones disponibles dentro de
        Slottye.
      </p>

      <p>
        La eliminación de una cuenta de cliente supone la
        eliminación de los datos asociados a dicha cuenta,
        sin perjuicio de aquellos cuya conservación resulte
        legalmente necesaria.
      </p>

      <p>
        Cuando un usuario con una reserva futura elimina su
        cuenta, la cita puede volver a quedar disponible
        para otros usuarios.
      </p>

      <p>
        Si se elimina una cuenta de negocio, la ficha y los
        datos asociados al negocio dejarán de estar
        disponibles. Los usuarios que tengan reservas
        futuras podrán recibir una comunicación informando
        de la cancelación de dichas citas.
      </p>

      {/* ======================================================
          15. DERECHOS
          ====================================================== */}

      <h2>
        15. Derechos de los usuarios
      </h2>

      <p>
        Puedes ejercer, cuando correspondan, los derechos
        reconocidos por la normativa de protección de
        datos, entre ellos:
      </p>

      <ul>
        <li>
          Derecho de acceso.
        </li>

        <li>
          Derecho de rectificación.
        </li>

        <li>
          Derecho de supresión.
        </li>

        <li>
          Derecho de oposición.
        </li>

        <li>
          Derecho a la limitación del tratamiento.
        </li>

        <li>
          Derecho a la portabilidad de los datos.
        </li>

        <li>
          Derecho a retirar el consentimiento cuando el
          tratamiento se base en él.
        </li>
      </ul>

      <p>
        Puedes ejercer estos derechos enviando una
        solicitud a:
      </p>

      <p>
        <a href="mailto:privacidad@slottye.com">
          <strong>
            privacidad@slottye.com
          </strong>
        </a>
      </p>

      <p>
        Para poder atender la solicitud y evitar accesos o
        modificaciones no autorizadas, podremos solicitar
        la información razonablemente necesaria para
        comprobar la identidad del solicitante.
      </p>

      <p>
        El ejercicio de estos derechos es gratuito con
        carácter general y las solicitudes deberán
        responderse en los plazos establecidos por la
        normativa aplicable. La AEPD indica que, con
        carácter general, deben atenderse en el plazo de un
        mes, ampliable en determinados casos por su
        complejidad o número. 
      </p>

      {/* ======================================================
          16. AEPD
          ====================================================== */}

      <h2>
        16. Reclamaciones
      </h2>

      <p>
        Si consideras que el tratamiento de tus datos
        personales no se ajusta a la normativa, tienes
        derecho a presentar una reclamación ante la
        autoridad de control competente.
      </p>

      <p>
        En España, la autoridad competente es la
        <strong>
          {" "}
          Agencia Española de Protección de Datos (AEPD)
        </strong>.
      </p>

      {/* ======================================================
          17. SEGURIDAD
          ====================================================== */}

      <h2>
        17. Seguridad
      </h2>

      <p>
        Slottye aplica medidas técnicas y organizativas
        destinadas a proteger los datos personales frente
        a accesos no autorizados, pérdida, alteración,
        divulgación o destrucción.
      </p>

      <p>
        Entre otras medidas, la plataforma utiliza
        mecanismos de autenticación, control de acceso,
        comunicaciones cifradas y políticas de acceso a
        los datos.
      </p>

      {/* ======================================================
          18. MENORES
          ====================================================== */}

      <h2>
        18. Menores de edad
      </h2>

      <p>
        Slottye no está dirigido específicamente a menores.
        Cuando la normativa exija autorización de los
        titulares de la patria potestad o tutela para el
        tratamiento de determinados datos, deberá
        obtenerse dicha autorización antes de utilizar las
        funcionalidades correspondientes.
      </p>

      {/* ======================================================
          19. CAMBIOS
          ====================================================== */}

      <h2>
        19. Cambios en esta política
      </h2>

      <p>
        Esta Política de privacidad podrá actualizarse para
        reflejar cambios en Slottye, en los servicios
        utilizados o en la normativa aplicable.
      </p>

      <p>
        Cuando los cambios sean relevantes, se procurará
        informar de ellos a los usuarios por medios
        razonables.
      </p>
    </LegalPage>
  );
}