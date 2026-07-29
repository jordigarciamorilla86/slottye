import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Condiciones de uso",
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Condiciones"
      title="Condiciones de uso"
    >
      <h2>1. Objeto</h2>

      <p>
        Estas condiciones regulan el acceso y utilización de
        Slottye por parte de clientes y negocios.
      </p>

      <h2>2. Cuenta de usuario</h2>

      <p>
        El usuario es responsable de proporcionar
        información correcta y de mantener la seguridad de
        sus credenciales de acceso.
      </p>

      <h2>3. Reservas</h2>

      <p>
        Slottye proporciona las herramientas tecnológicas
        necesarias para consultar disponibilidad y gestionar
        reservas entre usuarios y negocios.
      </p>

      <p>
        La prestación material del servicio reservado
        corresponde al negocio o profesional seleccionado.
      </p>

      <h2>4. Cancelaciones y modificaciones</h2>

      <p>
        Las posibilidades y plazos de cancelación o
        modificación podrán depender de las condiciones
        configuradas por cada negocio.
      </p>

      <p>
        Antes de realizar una operación, el usuario deberá
        comprobar las condiciones aplicables a su reserva.
      </p>

      <h2>5. Negocios</h2>

      <p>
        Los negocios son responsables de mantener
        actualizada y veraz la información publicada en su
        ficha, incluyendo servicios, disponibilidad,
        horarios, datos de contacto y demás información
        relacionada con su actividad.
      </p>

      <h2>6. Reseñas</h2>

      <p>
        Las reseñas deben reflejar experiencias reales y no
        podrán utilizarse para publicar contenido ilícito,
        ofensivo, fraudulento o ajeno a la experiencia
        valorada.
      </p>

      <h2>7. Uso indebido</h2>

      <p>
        Slottye podrá adoptar medidas frente a cuentas que
        utilicen la plataforma de forma fraudulenta, abusiva
        o contraria a estas condiciones o a la legislación
        aplicable.
      </p>

      <h2>8. Disponibilidad</h2>

      <p>
        Aunque se procura mantener la plataforma disponible,
        no puede garantizarse un funcionamiento
        ininterrumpido en todo momento debido a
        mantenimiento, incidencias técnicas u otras causas.
      </p>

      <h2>9. Modificación de las condiciones</h2>

      <p>
        Estas condiciones podrán actualizarse cuando
        resulte necesario por cambios en el servicio o en la
        normativa aplicable.
      </p>
    </LegalPage>
  );
}