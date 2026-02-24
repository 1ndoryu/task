import '../styles/paginasLegales.css';
import {GloryLink} from '../../../Glory/assets/react/src/core/router/GloryLink';

interface PoliticaPrivacidadProps {
  titulo?: string;
}

/*
 * Island para mostrar la Política de Privacidad.
 * Requisito obligatorio para OAuth Consent Screen de Google.
 * Cumple con RGPD y requisitos de transparencia de datos.
 */
export default function PoliticaPrivacidadIsland({ titulo = 'Política de Privacidad' }: PoliticaPrivacidadProps) {
  return (
    <div className="contenedorPaginaLegal">
      <div className="contenidoLegal">
        <h1>{titulo}</h1>
        <p className="fechaActualizacion">Última actualización: 1 de febrero de 2026</p>

        <section className="seccionLegal">
          <h2>1. Información General</h2>
          <p>
            Task Nakomi ("nosotros", "nuestro" o "la aplicación") se compromete a proteger tu privacidad.
            Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos tu información personal
            cuando utilizas nuestro servicio de gestión de productividad.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>2. Datos que Recopilamos</h2>
          
          <h3>2.1 Información de Cuenta</h3>
          <ul>
            <li><strong>Email:</strong> Para autenticación y comunicaciones esenciales</li>
            <li><strong>Nombre:</strong> Para personalizar tu experiencia</li>
            <li><strong>ID de usuario:</strong> Identificador único generado automáticamente</li>
            <li><strong>Foto de perfil:</strong> Si te autentícas con Google OAuth</li>
          </ul>

          <h3>2.2 Datos de Actividad</h3>
          <ul>
            <li><strong>Hábitos:</strong> Nombre, descripción, frecuencia y registros de cumplimiento</li>
            <li><strong>Tareas:</strong> Título, descripción, estado y fechas</li>
            <li><strong>Notas:</strong> Contenido de tus notas rápidas y guardadas</li>
            <li><strong>Equipos y colaboración:</strong> Miembros, permisos y contenido compartido</li>
            <li><strong>Archivos adjuntos:</strong> Documentos y archivos que subes a la plataforma</li>
          </ul>

          <h3>2.3 Datos Técnicos</h3>
          <ul>
            <li><strong>Dirección IP:</strong> Para seguridad y prevención de fraude</li>
            <li><strong>Navegador y dispositivo:</strong> Para optimizar la experiencia de usuario</li>
            <li><strong>Cookies de sesión:</strong> Para mantener tu sesión activa</li>
            <li><strong>Logs de actividad:</strong> Registro de acciones para auditoría de seguridad</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>3. Cómo Usamos tus Datos</h2>
          <ul>
            <li><strong>Proveer el servicio:</strong> Sincronización, almacenamiento y acceso a tus datos</li>
            <li><strong>Autenticación:</strong> Verificar tu identidad mediante Google OAuth</li>
            <li><strong>Mejoras del producto:</strong> Análisis agregados y anónimos de uso</li>
            <li><strong>Soporte técnico:</strong> Resolver problemas y responder consultas</li>
            <li><strong>Comunicaciones:</strong> Notificaciones importantes sobre el servicio</li>
            <li><strong>Seguridad:</strong> Prevenir fraude, abuso y accesos no autorizados</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>4. Almacenamiento y Seguridad</h2>
          
          <h3>4.1 Ubicación de Datos</h3>
          <p>
            Tus datos se almacenan en servidores propios ubicados en [especificar ubicación del servidor].
            No compartimos ni vendemos tu información personal a terceros.
          </p>

          <h3>4.2 Medidas de Seguridad</h3>
          <ul>
            <li><strong>Cifrado en tránsito:</strong> HTTPS/TLS para todas las comunicaciones</li>
            <li><strong>Cifrado opcional E2EE:</strong> Puedes activar cifrado de extremo a extremo para notas sensibles</li>
            <li><strong>Hashing de contraseñas:</strong> Bcrypt con salt para credenciales</li>
            <li><strong>Control de acceso:</strong> Autenticación de dos factores disponible</li>
            <li><strong>Backups cifrados:</strong> Copias de seguridad automáticas protegidas</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>5. Compartición de Datos</h2>
          
          <h3>5.1 Servicios de Terceros</h3>
          <p>Solo compartimos datos con proveedores esenciales:</p>
          <ul>
            <li><strong>Google OAuth:</strong> Para autenticación (email, nombre, foto de perfil)</li>
            <li><strong>Stripe:</strong> Para procesamiento de pagos (datos de facturación)</li>
            <li><strong>Proveedores de infraestructura:</strong> Hosting y CDN (datos técnicos mínimos)</li>
          </ul>

          <h3>5.2 Colaboración entre Usuarios</h3>
          <p>
            Cuando compartes contenido con equipos, los miembros autorizados pueden ver
            los datos compartidos según los permisos configurados.
          </p>

          <h3>5.3 Obligaciones Legales</h3>
          <p>
            Podemos divulgar información si es requerido por ley, orden judicial o
            autoridad gubernamental competente.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>6. Tus Derechos (RGPD)</h2>
          <p>De acuerdo con el Reglamento General de Protección de Datos (RGPD), tienes derecho a:</p>
          <ul>
            <li><strong>Acceso:</strong> Obtener copia de todos tus datos personales</li>
            <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
            <li><strong>Eliminación:</strong> Borrar tu cuenta y todos tus datos</li>
            <li><strong>Portabilidad:</strong> Exportar tus datos en formato estructurado (JSON)</li>
            <li><strong>Restricción:</strong> Limitar el procesamiento de tus datos</li>
            <li><strong>Oposición:</strong> Objetar ciertos usos de tus datos</li>
            <li><strong>Retirar consentimiento:</strong> Cancelar permisos previamente otorgados</li>
          </ul>
          <p>
            Para ejercer estos derechos, contacta a: <strong>soporte@nakomi.studio</strong>
          </p>
        </section>

        <section className="seccionLegal">
          <h2>7. Retención de Datos</h2>
          <ul>
            <li><strong>Cuenta activa:</strong> Mientras mantengas tu cuenta</li>
            <li><strong>Cuenta eliminada:</strong> 30 días para permitir recuperación, luego borrado permanente</li>
            <li><strong>Backups:</strong> Los backups se eliminan automáticamente después de 90 días</li>
            <li><strong>Logs de seguridad:</strong> Se conservan por 12 meses con fines de auditoría</li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>8. Cookies y Tecnologías Similares</h2>
          
          <h3>8.1 Cookies Esenciales</h3>
          <ul>
            <li><strong>Sesión de usuario:</strong> Para mantener tu login activo</li>
            <li><strong>Preferencias:</strong> Tema, idioma y configuraciones de UI</li>
          </ul>

          <h3>8.2 Cookies Analíticas (Opcional)</h3>
          <p>
            Solo si otorgas consentimiento, usamos cookies para mejorar el servicio.
            Puedes desactivarlas en cualquier momento desde tu configuración.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>9. Menores de Edad</h2>
          <p>
            Nuestro servicio no está dirigido a menores de 16 años. Si descubrimos que
            recopilamos datos de un menor sin consentimiento parental, eliminaremos
            la información inmediatamente.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>10. Transferencias Internacionales</h2>
          <p>
            Si accedes al servicio desde fuera de [tu país/región], tus datos pueden
            transferirse a través de fronteras. Implementamos salvaguardas adecuadas
            como cláusulas contractuales estándar aprobadas por la UE.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>11. Cambios a esta Política</h2>
          <p>
            Nos reservamos el derecho de actualizar esta Política de Privacidad.
            Los cambios significativos se notificarán por email y mediante un aviso
            destacado en la aplicación. El uso continuado del servicio después de
            la notificación constituye aceptación de los cambios.
          </p>
        </section>

        <section className="seccionLegal">
          <h2>12. Contacto</h2>
          <p>
            Para preguntas, solicitudes o inquietudes sobre esta Política de Privacidad
            o el manejo de tus datos personales, contáctanos en:
          </p>
          <ul className="listaContacto">
            <li><strong>Email:</strong> soporte@nakomi.studio</li>
            <li><strong>Delegado de Protección de Datos:</strong> dpo@nakomi.studio</li>
            <li><strong>Formulario de solicitudes RGPD:</strong> <GloryLink href="/soporte">task.nakomi.studio/soporte</GloryLink></li>
          </ul>
        </section>

        <section className="seccionLegal">
          <h2>13. Autoridad de Supervisión</h2>
          <p>
            Si consideras que tus derechos de protección de datos han sido vulnerados,
            puedes presentar una reclamación ante tu autoridad local de protección de datos.
          </p>
        </section>
      </div>
    </div>
  );
}
