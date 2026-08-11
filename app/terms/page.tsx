import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Condiciones de uso",
  description:
    "Condiciones aplicables al uso de Slottye por parte de clientes y negocios.",
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Condiciones"
      title="Condiciones de uso"
    >
      <p className="muted">
        Última actualización: 11 de agosto de 2026
      </p>

      <h2>1. Objeto</h2>

      <p>
        Estas Condiciones de uso regulan el acceso y
        utilización de Slottye por parte de usuarios,
        clientes, negocios y profesionales.
      </p>

      <p>
        Slottye proporciona una plataforma tecnológica para
        localizar negocios y profesionales, consultar sus
        servicios y disponibilidad, gestionar reservas y,
        en el caso de los negocios, publicar y administrar
        información relacionada con su actividad.
      </p>

      <h2>2. Aceptación de las condiciones</h2>

      <p>
        El acceso o utilización de determinadas
        funcionalidades de Slottye implica la aceptación de
        estas Condiciones de uso y de las demás políticas
        aplicables.
      </p>

      <p>
        Si no estás de acuerdo con estas condiciones, no
        debes utilizar las funcionalidades que requieran su
        aceptación.
      </p>

      <h2>3. Cuenta de usuario</h2>

      <p>
        Algunas funciones de Slottye requieren la creación
        de una cuenta.
      </p>

      <p>
        El usuario se compromete a proporcionar información
        correcta y actualizada y a mantener la
        confidencialidad de sus credenciales.
      </p>

      <p>
        El usuario es responsable de las actuaciones
        realizadas desde su cuenta salvo que pueda
        acreditarse un uso no autorizado ajeno a su
        responsabilidad.
      </p>

      <p>
        Si detectas un acceso no autorizado o cualquier
        incidencia de seguridad relacionada con tu cuenta,
        debes comunicarlo a Slottye lo antes posible.
      </p>

      <h2>4. Tipos de cuenta</h2>

      <p>
        Slottye puede ofrecer distintos tipos de cuenta,
        entre ellos cuentas de cliente y cuentas de
        negocio.
      </p>

      <p>
        Los usuarios deberán utilizar el tipo de cuenta que
        corresponda a la finalidad real con la que utilizan
        la plataforma.
      </p>

      <h2>5. Reservas</h2>

      <p>
        Los usuarios pueden consultar la disponibilidad
        publicada por los negocios y realizar reservas de
        los servicios disponibles.
      </p>

      <p>
        La reserva se realiza respecto del negocio o
        profesional seleccionado y para la fecha, hora y
        servicio indicados durante el proceso.
      </p>

      <p>
        Slottye actúa como plataforma tecnológica de
        intermediación y gestión de reservas. La prestación
        material del servicio corresponde al negocio o
        profesional seleccionado.
      </p>

      <h2>6. Disponibilidad</h2>

      <p>
        La disponibilidad mostrada en Slottye depende de la
        información publicada y gestionada por los negocios
        y de las reservas realizadas a través de la
        plataforma.
      </p>

      <p>
        Cuando un negocio active una integración con un
        calendario externo, la disponibilidad también podrá
        depender de la información obtenida mediante dicha
        integración.
      </p>

      <p>
        Aunque Slottye aplica mecanismos técnicos para
        reducir conflictos de disponibilidad, pueden
        producirse incidencias excepcionales derivadas de
        errores, retrasos de sincronización, modificaciones
        realizadas por el negocio, incidencias en servicios
        de terceros u otras circunstancias.
      </p>

      <h2>7. Confirmaciones y comunicaciones</h2>

      <p>
        Slottye puede enviar comunicaciones relacionadas
        con las reservas y con la seguridad o funcionamiento
        de la cuenta.
      </p>

      <p>
        Entre estas comunicaciones pueden encontrarse:
      </p>

      <ul>
        <li>Confirmaciones de reserva.</li>
        <li>Cancelaciones.</li>
        <li>Reprogramaciones.</li>
        <li>Recordatorios de citas.</li>
        <li>
          Avisos de cambios importantes relacionados con
          una reserva.
        </li>
        <li>
          Comunicaciones derivadas de la eliminación o
          indisponibilidad de un negocio.
        </li>
      </ul>

      <h2>8. Cancelaciones por parte del usuario</h2>

      <p>
        El usuario podrá cancelar una reserva cuando la
        funcionalidad correspondiente esté disponible y
        dentro de las condiciones aplicables a dicha
        reserva.
      </p>

      <p>
        Cuando una reserva sea cancelada y el horario pueda
        volver a utilizarse, el hueco podrá ponerse
        nuevamente a disposición de otros usuarios.
      </p>

      <p>
        Los usuarios suscritos al negocio podrán recibir
        avisos de disponibilidad si tienen habilitadas esas
        comunicaciones.
      </p>

      <h2>9. Cancelaciones por parte del negocio</h2>

      <p>
        Un negocio podrá cancelar reservas cuando resulte
        necesario por motivos relacionados con la prestación
        del servicio, disponibilidad, incidencias u otras
        circunstancias justificadas.
      </p>

      <p>
        Cuando esto ocurra, Slottye podrá informar al
        usuario mediante los medios disponibles en la
        plataforma, incluyendo correo electrónico.
      </p>

      <h2>10. Reprogramaciones</h2>

      <p>
        Cuando Slottye permita modificar la fecha u hora de
        una reserva, la reprogramación estará sujeta a la
        disponibilidad existente en ese momento.
      </p>

      <p>
        El horario previamente reservado podrá volver a
        quedar disponible para otros usuarios cuando la
        modificación se complete correctamente.
      </p>

      <h2>11. Negocios y profesionales</h2>

      <p>
        Los negocios son responsables de mantener
        actualizada y veraz la información publicada en su
        ficha.
      </p>

      <p>
        Esto incluye, entre otros aspectos:
      </p>

      <ul>
        <li>Nombre y datos del negocio.</li>
        <li>Dirección y datos de contacto.</li>
        <li>Servicios ofrecidos.</li>
        <li>Horarios.</li>
        <li>Disponibilidad.</li>
        <li>Imágenes.</li>
        <li>
          Información relacionada con la prestación de sus
          servicios.
        </li>
      </ul>

      <p>
        Cuando el negocio conecte servicios o calendarios
        externos, será responsable de utilizar cuentas y
        calendarios sobre los que disponga de autorización
        suficiente.
      </p>

      <p>
        El negocio será responsable de disponer de las
        licencias, autorizaciones, titulaciones o requisitos
        que sean necesarios para desarrollar su actividad.
      </p>

      <h2>12. Prestación de los servicios reservados</h2>

      <p>
        La prestación material del servicio corresponde
        exclusivamente al negocio o profesional
        seleccionado por el usuario.
      </p>

      <p>
        Slottye no controla la ejecución concreta del
        servicio, su calidad profesional, resultado,
        condiciones particulares o cumplimiento de
        obligaciones específicas que correspondan al
        negocio.
      </p>

      <h2>13. Precios y pagos</h2>

      <p>
        Salvo que se indique expresamente lo contrario,
        Slottye puede mostrar información relativa a los
        servicios ofrecidos por los negocios, pero la
        relación económica asociada a la prestación del
        servicio corresponde al usuario y al negocio.
      </p>

      <p>
        Si en el futuro Slottye incorpora sistemas de pago
        integrados, sus condiciones específicas se
        comunicarán antes de utilizar dichas
        funcionalidades.
      </p>

      <h2>14. Favoritos y suscripciones</h2>

      <p>
        Los usuarios pueden guardar negocios como favoritos
        o suscribirse a determinados avisos cuando estas
        funciones estén disponibles.
      </p>

      <p>
        Las suscripciones pueden permitir recibir
        comunicaciones sobre nuevas citas o huecos que
        vuelvan a estar disponibles.
      </p>

      <p>
        El usuario podrá desactivar estos avisos cuando la
        plataforma ofrezca dicha opción.
      </p>

      <h2>15. Reseñas y valoraciones</h2>

      <p>
        Las reseñas deben reflejar experiencias reales y
        deberán utilizarse de forma responsable.
      </p>

      <p>
        No está permitido publicar contenido:
      </p>

      <ul>
        <li>Falso o fraudulento.</li>
        <li>Ilícito.</li>
        <li>Difamatorio.</li>
        <li>Amenazante.</li>
        <li>Discriminatorio.</li>
        <li>
          Que vulnere derechos de propiedad intelectual,
          privacidad u otros derechos de terceros.
        </li>
        <li>
          Que no tenga relación razonable con la experiencia
          valorada.
        </li>
      </ul>

      <p>
        Slottye podrá retirar o limitar contenidos que
        incumplan estas condiciones o cuando exista una
        obligación legal para hacerlo.
      </p>

      <h2>16. Uso indebido</h2>

      <p>
        Queda prohibido utilizar Slottye para:
      </p>

      <ul>
        <li>Realizar actividades fraudulentas.</li>
        <li>Crear reservas falsas de forma intencionada.</li>
        <li>
          Acceder o intentar acceder a cuentas o datos de
          terceros sin autorización.
        </li>
        <li>
          Interferir con el funcionamiento normal de la
          plataforma.
        </li>
        <li>
          Automatizar abusivamente el uso del servicio.
        </li>
        <li>
          Publicar contenidos ilícitos o que vulneren
          derechos de terceros.
        </li>
      </ul>

      <h2>17. Medidas frente a abusos</h2>

      <p>
        Slottye podrá adoptar medidas razonables cuando
        existan indicios de incumplimiento de estas
        condiciones, fraude, abuso o riesgos de seguridad.
      </p>

      <p>
        Entre estas medidas podrán encontrarse la
        limitación de funcionalidades, suspensión temporal
        o eliminación de cuentas cuando resulte
        proporcionado y legalmente procedente.
      </p>

      <h2>18. Eliminación de cuenta de cliente</h2>

      <p>
        Los clientes pueden eliminar su cuenta desde las
        opciones disponibles en Slottye.
      </p>

      <p>
        La eliminación es una acción permanente respecto de
        los datos y funcionalidades que correspondan, sin
        perjuicio de aquellos datos que deban conservarse
        cuando exista una obligación legal.
      </p>

      <p>
        Si el cliente tiene reservas futuras en el momento
        de eliminar su cuenta, dichas reservas podrán
        eliminarse y los horarios correspondientes podrán
        volver a quedar disponibles.
      </p>

      <h2>19. Eliminación de cuenta de negocio</h2>

      <p>
        Los negocios pueden eliminar su cuenta y su ficha
        desde las opciones disponibles en Slottye.
      </p>

      <p>
        Esta acción puede implicar la eliminación
        permanente de:
      </p>

      <ul>
        <li>Ficha del negocio.</li>
        <li>Servicios.</li>
        <li>Horarios.</li>
        <li>Disponibilidad.</li>
        <li>Imágenes.</li>
        <li>Reservas asociadas.</li>
        <li>
          Otros datos vinculados al uso del negocio en
          Slottye.
        </li>
      </ul>

      <p>
        Cuando existan reservas futuras, Slottye podrá
        comunicar a los clientes afectados que dichas citas
        han sido canceladas como consecuencia de la
        eliminación o indisponibilidad del negocio.
      </p>

      <h2>20. Disponibilidad técnica de Slottye</h2>

      <p>
        Slottye procura mantener la plataforma disponible,
        segura y operativa.
      </p>

      <p>
        Sin embargo, pueden producirse interrupciones
        temporales por mantenimiento, actualizaciones,
        incidencias técnicas, problemas de proveedores
        externos o circunstancias fuera del control
        razonable de Slottye.
      </p>

      <h2>21. Servicios e integraciones de terceros</h2>

      <p>
        Algunas funcionalidades de Slottye dependen de
        proveedores tecnológicos externos, como servicios
        de autenticación, mapas, información de lugares,
        calendarios, infraestructura, correo electrónico o
        alojamiento.
      </p>

      <p>
        Entre estas funcionalidades puede encontrarse la
        integración opcional con Google Calendar, que
        permite a los negocios sincronizar determinadas
        reservas, eventos y periodos ocupados entre su
        calendario y la agenda de Slottye.
      </p>

      <p>
        El funcionamiento de estas integraciones puede
        depender de la disponibilidad, condiciones,
        permisos, límites técnicos y cambios introducidos
        por el proveedor externo correspondiente.
      </p>

      <p>
        Slottye procurará gestionar correctamente las
        integraciones ofrecidas, pero no puede garantizar
        la disponibilidad ininterrumpida de servicios
        proporcionados y controlados por terceros.
      </p>

      <p>
        La conexión con Google Calendar es voluntaria. El
        negocio puede desconectarla mediante las opciones
        disponibles en Slottye cuando ya no desee utilizar
        la sincronización.
      </p>

      <p>
        Determinadas funcionalidades podrán estar sujetas
        también a las condiciones del proveedor
        correspondiente.
      </p>

      <h2>22. Propiedad intelectual</h2>

      <p>
        El software, diseño, marca, logotipo y contenidos
        propios de Slottye están protegidos por la
        normativa de propiedad intelectual e industrial.
      </p>

      <p>
        Los usuarios y negocios deberán disponer de los
        derechos necesarios sobre cualquier contenido que
        publiquen en la plataforma.
      </p>

      <h2>23. Protección de datos</h2>

      <p>
        El tratamiento de datos personales realizado a
        través de Slottye se regula en nuestra{" "}
        <a href="/privacy">
          Política de privacidad
        </a>
        .
      </p>

      <p>
        La información sobre cookies y tecnologías
        similares está disponible en nuestra{" "}
        <a href="/cookies">
          Política de cookies
        </a>
        .
      </p>

      <h2>24. Modificación de las condiciones</h2>

      <p>
        Estas Condiciones de uso podrán actualizarse cuando
        resulte necesario por cambios en la plataforma, en
        las funcionalidades ofrecidas, en los modelos de
        servicio o en la normativa aplicable.
      </p>

      <p>
        Cuando los cambios sean relevantes, se procurará
        informar a los usuarios por medios razonables.
      </p>

      <h2>25. Legislación aplicable</h2>

      <p>
        Estas condiciones se rigen por la legislación
        española.
      </p>

      <p>
        Lo anterior se entiende sin perjuicio de los
        derechos imperativos reconocidos a consumidores y
        usuarios por la normativa aplicable.
      </p>

      <h2>26. Contacto</h2>

      <p>
        Para consultas relacionadas con estas condiciones
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