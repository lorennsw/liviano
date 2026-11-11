# Liviano

Un navegador recortado para PCs de gama baja. Liviano toma **Thorium** (o Chromium), lo abre con las funciones de relleno apagadas y le suma bloqueo de anuncios, suspensión de pestañas y tres modos: **Eco**, **Pro** y **Extremo**.

No es un navegador recompilado: es Thorium sin modificar, más un lanzador que lo arranca recortado y una extensión que viene integrada. Por eso sigue recibiendo las actualizaciones de Thorium.

## Qué necesitás

- Windows 10 u 11 de 64 bits.
- Thorium o Chromium. Si no tenés ninguno, Liviano ofrece instalar Thorium.

## Instalación

1. Bajá el proyecto: botón verde **Code → Download ZIP**.
2. Descomprimilo en una carpeta fija, por ejemplo `Documentos\Liviano`.
3. Abrí **Instalar.cmd**. Crea el acceso **Liviano** en el Escritorio.
4. Abrí **Liviano** desde el Escritorio.

Windows puede mostrar un aviso de seguridad al abrir archivos `.cmd` bajados de internet. Son archivos de texto: podés abrirlos con el Bloc de notas y leer qué hacen antes de ejecutarlos.

### Si no tenés Thorium

La primera vez, Liviano detecta tu procesador, elige la versión de Thorium que le corresponde (AVX2, SSE4 o SSE3) y te pregunta si querés instalarla con `winget`, el instalador de paquetes de Windows. Antes de preguntar muestra la versión y la dirección de descarga.

**Leé esa dirección antes de aceptar.** Thorium lo mantiene un grupo chico de voluntarios y el origen de los instaladores puede cambiar. Un navegador maneja tus contraseñas: instalalo solo si confiás en ese origen. Si preferís, instalá Thorium o Chromium por tu cuenta y Liviano lo va a encontrar.

## Los tres modos

El modo se elige en la página de nueva pestaña. La primera vez Liviano elige uno según la memoria de la PC: hasta 4 GB, Extremo; hasta 8 GB, Eco; más, Pro.

| Modo | En las páginas | En el motor |
|---|---|---|
| **Eco** | Bloquea anuncios y rastreadores. Suspende pestañas sin usar a los 10 min. Sin animaciones, sin video o audio que arranca solo, sin precarga. | Un proceso por sitio, sin desplazamiento suave, sin transmisión a otros dispositivos. |
| **Pro** | Bloquea anuncios y rastreadores. Suspende a los 30 min. Precarga enlaces del mismo sitio al pasar el mouse. | Sin recortes visibles; descargas en paralelo. |
| **Extremo** | Todo lo de Eco. Suspende a los 3 min. Bloquea fuentes web, video/audio directo y marcos de terceros. Sin traductor. | Todo lo de Eco, más un tope de 4 procesos de páginas y sin caché de páginas anteriores. |

Los cambios en las páginas rigen al instante. Los del motor se completan al cerrar y volver a abrir Liviano.

En los tres modos se apagan además los reportes de fallos, la telemetría, las funciones de IA de Google, el sistema de anuncios integrado en el motor y el botón de perfil.

## Controles

- **Nueva pestaña:** buscador, selector de modo, suspender las demás pestañas, mostrar tus sitios más visitados y "Solo texto" (sin imágenes).
- **Clic derecho en una página:** pausar o reanudar Liviano en ese sitio, y activar o quitar "Solo texto".

Las pestañas fijadas, las que tienen sonido y las que tienen texto escrito sin enviar no se suspenden. Extremo puede romper sitios; si pasa, pausá Liviano en ese sitio.

## Usarlo en Chrome o Edge

La carpeta `liviano` es una extensión normal. En `chrome://extensions` activá **Modo de desarrollador**, tocá **Cargar descomprimida** y elegí esa carpeta. Ahí funcionan los modos en las páginas, pero no los recortes del motor.

## Límites

- La barra de arriba es la de Thorium: el botón de inicio, el del matraz y el menú de extensiones siguen ahí.
- La lista de bloqueo tiene unos 120 dominios conocidos, bastante menos que un bloqueador dedicado como uBlock Origin.
- Está probado en una sola PC (Windows 10, Intel i3 de dos núcleos, 4 GB de RAM) con Thorium 156 y Edge 157. No hay mediciones de cuánta memoria ahorra cada opción.
- En la barra de tareas la ventana muestra el ícono de Thorium.

## Otras formas de abrirlo

```
Liviano.cmd /ver                 muestra qué navegador, modo y opciones usaría, sin abrir nada
Liviano.cmd extremo              fuerza el recorte del motor solo por esta vez
```

Si tu navegador está en otra carpeta o es portable, creá un archivo `navegador.txt` al lado de `Liviano.cmd` con la ruta completa del `.exe` adentro.

## Desinstalar

Borrá el acceso del Escritorio y la carpeta. Thorium queda instalado como cualquier programa y se quita desde Configuración → Aplicaciones.

## Licencia

MIT. Ver [LICENSE](LICENSE).
