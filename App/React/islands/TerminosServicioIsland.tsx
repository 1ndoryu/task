import React from 'react';
import '../styles/paginasLegales.css';

interface TerminosServicioProps {
  titulo?: string;
}

/*
 * Island para mostrar los Términos de Servicio.
 * Recomendado para OAuth Consent Screen y protección legal del servicio.
 */
export default function TerminosServicioIsland({ titulo = 'Términos de Servicio' }: TerminosServicioProps) {
  return (
    <div className="contenedorPaginaLegal">
      <div className="contenidoLegal">
        <h1>{titulo}</h1>
        <p className="fechaActualizacion">Última actualización: 1 de febrero de 2026</p>

        <section className="seccionLegal">
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar Task Nakomi ("el Servicio"), aceptas estar legalmente vinculado
            por estos Términos de Servicio ("Términos"). Si no estás de acuerdo con alguna parte
            de estos Términos, no debes utilizar el Servicio.
          </p>
          <p>
            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios
            entrarán en vigor inmediatamente después de su publicación. El uso continuado del Servicio
            después de la publicación de cambios constituye tu aceptación de los nuevos Términos.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>2. Descripción del Servicio</h2>
          <p>
            Task Nakomi es una plataforma de productividad personal que permite a los usuarios:
          </p>
          <ul>
            <li>Crear y gestionar hábitos diarios con seguimiento de progreso</li>
            <li>Organizar tareas con prioridades y estados personalizables</li>
            <li>Tomar notas rápidas con opción de guardado y cifrado</li>
            <li>Colaborar en equipos compartidos con permisos configurables</li>
            <li>Adjuntar y gestionar archivos relacionados con tareas</li>
            <li>Acceder a reportes y estadísticas de actividad</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>3. Registro y Seguridad de Cuenta</h2>
          
          <h3>3.1 Requisitos de Cuenta</h3>
          <ul>
            <li>Debes tener al menos 16 años de edad para usar el Servicio</li>
            <li>Debes proporcionar información precisa y actualizada</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta</li>
            <li>No puedes compartir tu cuenta con terceros</li>
          </ul>

          <h3>3.2 Autenticación</h3>
          <p>
            Soportamos autenticación mediante:
          </p>
          <ul>
            <li><strong>Google OAuth:</strong> Usando tu cuenta de Google existente</li>
            <li><strong>Email/Contraseña:</strong> Registro directo en la plataforma</li>
          </ul>

          <h3>3.3 Seguridad</h3>
          <p>
            Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta
            o cualquier otra violación de seguridad. No seremos responsables de pérdidas
            derivadas del uso no autorizado de tu cuenta.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>4. Uso Aceptable</h2>
          
          <h3>4.1 Conductas Prohibidas</h3>
          <p>Al usar el Servicio, aceptas NO:</p>
          <ul>
            <li>Violar leyes locales, nacionales o internacionales</li>
            <li>Cargar contenido ilegal, difamatorio, obsceno o que infrinja derechos de terceros</li>
            <li>Intentar acceder a cuentas o datos de otros usuarios</li>
            <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente</li>
            <li>Usar el Servicio para enviar spam, phishing o contenido malicioso</li>
            <li>Sobrecargar o interferir con la infraestructura del Servicio</li>
            <li>Crear múltiples cuentas para evadir restricciones</li>
            <li>Vender, revender o explotar comercialmente el Servicio sin autorización</li>
          </ul>

          <h3>4.2 Contenido del Usuario</h3>
          <p>
            Eres el único responsable del contenido que creas, subes o compartes en el Servicio.
            Nos reservamos el derecho de eliminar contenido que viole estos Términos sin previo aviso.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>5. Suscripciones y Pagos</h2>
          
          <h3>5.1 Planes Disponibles</h3>
          <ul>
            <li><strong>Plan Gratuito:</strong> Acceso básico con limitaciones funcionales</li>
            <li><strong>Plan Premium:</strong> Acceso completo mediante suscripción mensual/anual</li>
          </ul>

          <h3>5.2 Procesamiento de Pagos</h3>
          <p>
            Los pagos se procesan a través de <strong>Stripe</strong>, un procesador de pagos
            certificado PCI-DSS. No almacenamos datos completos de tarjetas de crédito en nuestros servidores.
          </p>

          <h3>5.3 Facturación y Renovación</h3>
          <ul>
            <li>Las suscripciones se renuevan automáticamente al final de cada período</li>
            <li>Se te cobrará al método de pago registrado</li>
            <li>Puedes cancelar tu suscripción en cualquier momento desde tu perfil</li>
            <li>Las cancelaciones tienen efecto al final del período de facturación actual</li>
            <li>No se emiten reembolsos por períodos parciales, salvo excepciones legales</li>
          </ul>

          <h3>5.4 Cambios de Precio</h3>
          <p>
            Nos reservamos el derecho de modificar los precios de las suscripciones con
            30 días de aviso previo. Los cambios no afectarán tu ciclo de facturación actual.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>6. Propiedad Intelectual</h2>
          
          <h3>6.1 Derechos del Servicio</h3>
          <p>
            Todo el contenido del Servicio, incluyendo diseño, código, gráficos, logos y texto,
            es propiedad exclusiva de Task Nakomi o sus licenciantes y está protegido por
            leyes de propiedad intelectual.
          </p>

          <h3>6.2 Derechos de tu Contenido</h3>
          <p>
            Tú conservas todos los derechos sobre el contenido que creas en el Servicio.
            Al usar el Servicio, nos otorgas una licencia limitada, no exclusiva, transferible
            y sublicenciable para:
          </p>
          <ul>
            <li>Almacenar, procesar y mostrar tu contenido</li>
            <li>Crear backups de seguridad</li>
            <li>Permitir el acceso a usuarios con quienes compartes contenido</li>
          </ul>
          <p>
            Esta licencia termina cuando eliminas tu contenido o tu cuenta, excepto para
            copias de backup que se eliminarán según nuestra política de retención.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>7. Disponibilidad y Mantenimiento</h2>
          <ul>
            <li>Nos esforzamos por mantener el Servicio disponible 24/7</li>
            <li>Pueden ocurrir interrupciones por mantenimiento programado (notificado con antelación)</li>
            <li>No garantizamos disponibilidad ininterrumpida o libre de errores</li>
            <li>No somos responsables de pérdida de datos por factores fuera de nuestro control</li>
            <li>Recomendamos exportar periódicamente tu información importante</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>8. Terminación de Cuenta</h2>
          
          <h3>8.1 Terminación por el Usuario</h3>
          <p>
            Puedes eliminar tu cuenta en cualquier momento desde la configuración de perfil.
            Todos tus datos serán programados para eliminación permanente después de 30 días.
          </p>

          <h3>8.2 Terminación por Nosotros</h3>
          <p>
            Nos reservamos el derecho de suspender o eliminar cuentas que:
          </p>
          <ul>
            <li>Violen estos Términos de Servicio</li>
            <li>Participen en actividades fraudulentas o ilegales</li>
            <li>Pongan en riesgo la seguridad del Servicio o de otros usuarios</li>
            <li>Permanezcan inactivas por más de 2 años (con notificación previa)</li>
          </ul>

          <h3>8.3 Efectos de la Terminación</h3>
          <p>
            Al terminar tu cuenta:
          </p>
          <ul>
            <li>Perderás acceso inmediato al Servicio</li>
            <li>Tus datos personales serán eliminados según la Política de Privacidad</li>
            <li>Las suscripciones activas se cancelarán sin reembolso</li>
            <li>Los datos compartidos con equipos pueden permanecer visibles para otros miembros</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>9. Limitación de Responsabilidad</h2>
          <p>
            EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY APLICABLE:
          </p>
          <ul>
            <li>
              El Servicio se proporciona "TAL CUAL" y "SEGÚN DISPONIBILIDAD" sin garantías
              de ningún tipo, expresas o implícitas
            </li>
            <li>
              No garantizamos que el Servicio sea ininterrumpido, seguro o libre de errores
            </li>
            <li>
              No somos responsables de daños directos, indirectos, incidentales, consecuentes
              o punitivos derivados del uso o imposibilidad de usar el Servicio
            </li>
            <li>
              Nuestra responsabilidad total no excederá la cantidad pagada por ti en los
              últimos 12 meses o 100 EUR, lo que sea mayor
            </li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>10. Indemnización</h2>
          <p>
            Aceptas indemnizar, defender y eximir de responsabilidad a Task Nakomi, sus
            directores, empleados y afiliados de cualquier reclamación, pérdida, daño,
            responsabilidad y gasto (incluyendo honorarios legales razonables) derivados de:
          </p>
          <ul>
            <li>Tu uso del Servicio</li>
            <li>Tu violación de estos Términos</li>
            <li>Tu violación de derechos de terceros</li>
            <li>Contenido que subas o compartas en el Servicio</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>11. Ley Aplicable y Jurisdicción</h2>
          <p>
            Estos Términos se regirán e interpretarán de acuerdo con las leyes de [especificar país/región],
            sin dar efecto a ninguna disposición sobre conflicto de leyes.
          </p>
          <p>
            Cualquier disputa relacionada con estos Términos se resolverá en los tribunales
            competentes de [especificar jurisdicción].
          </p>
        </section>

        <section className="seccionLegal">
          <h2>12. Disposiciones Generales</h2>
          
          <h3>12.1 Integralidad del Acuerdo</h3>
          <p>
            Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo
            completo entre tú y Task Nakomi respecto al uso del Servicio.
          </p>

          <h3>12.2 Renuncia</h3>
          <p>
            La falta de ejercicio de cualquier derecho bajo estos Términos no constituye
            una renuncia a ese derecho.
          </p>

          <h3>12.3 Divisibilidad</h3>
          <p>
            Si alguna disposición de estos Términos se considera inválida o inaplicable,
            las disposiciones restantes permanecerán en pleno vigor y efecto.
          </p>

          <h3>12.4 Asignación</h3>
          <p>
            No puedes transferir o asignar tus derechos bajo estos Términos sin nuestro
            consentimiento previo por escrito. Nosotros podemos asignar estos Términos
            sin restricciones.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>13. Contacto</h2>
          <p>
            Para preguntas sobre estos Términos de Servicio, contáctanos en:
          </p>
          <ul className="listaContacto">
            <li><strong>Email:</strong> legal@nakomi.studio</li>
            <li><strong>Soporte general:</strong> soporte@nakomi.studio</li>
            <li><strong>Formulario de contacto:</strong> <a href="/soporte">task.nakomi.studio/soporte</a></li>
          </ul>
        </section>

        <div className="notaFinal">
          <p>
            <strong>Nota:</strong> Al continuar usando Task Nakomi, confirmas que has leído,
            entendido y aceptado estos Términos de Servicio en su totalidad.
          </p>
        </div>
      </div>
    </div>
  );
}
