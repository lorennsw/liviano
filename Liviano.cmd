@echo off
setlocal EnableExtensions
rem ---------------------------------------------------------------------------
rem  Liviano: abre Thorium o Chromium recortado, con Liviano integrado.
rem
rem  Uso normal: el acceso "Liviano" del Escritorio. El modo (Eco, Pro o
rem  Extremo) se elige adentro del navegador; aca se lee cual quedo elegido y
rem  se arranca el motor con el mismo recorte.
rem
rem  Opcionales:  Liviano.cmd [/ver] [eco|pro|extremo] [direcciones u opciones]
rem    /ver      muestra que navegador, modo y opciones usaria, sin abrir nada
rem    eco|pro|extremo   fuerza el recorte del motor solo por esta vez
rem ---------------------------------------------------------------------------

set "AQUI=%~dp0"
set "EXT=%AQUI%liviano"

rem --- Argumentos ------------------------------------------------------------
set "OCULTO="
set "VER="
set "MODO="
set "RESTO=%*"
:args
if /i "%~1"=="/oculto" goto :arg_oculto
if /i "%~1"=="/ver" goto :arg_ver
if /i "%~1"=="eco" goto :arg_modo
if /i "%~1"=="pro" goto :arg_modo
if /i "%~1"=="extremo" goto :arg_modo
goto :args_fin
:arg_oculto
set "OCULTO=1"
goto :arg_quitar
:arg_ver
set "VER=1"
goto :arg_quitar
:arg_modo
set "MODO=%~1"
:arg_quitar
if defined RESTO call set "RESTO=%%RESTO:*%1=%%"
shift
goto :args
:args_fin

rem --- Buscar el navegador ---------------------------------------------------
rem Si existe navegador.txt al lado de este archivo, manda esa ruta
rem (sirve para versiones portables o instaladas en otro lugar).
call :detectar
rem Si no hay ninguno, ofrece instalar Thorium (pregunta antes de descargar).
rem El acceso del Escritorio corre sin ventana: para preguntar hay que mostrarla.
if not defined NAV if defined OCULTO goto :mostrar
if not defined NAV call :ofrecer_instalar
if not defined NAV goto :sin_navegador
if not exist "%NAV%" goto :sin_navegador

rem --- Modo ------------------------------------------------------------------
rem La primera vez se recomienda un modo segun la memoria de esta PC.
if not exist "%EXT%\launch.json" call :recomendar
if not defined MODO call :leer_modo
if not defined MODO set "MODO=pro"

rem --- Opciones comunes a los tres modos -------------------------------------
rem  disable-breakpad          sin reportes de fallos
rem  disable-domain-reliability, no-pings   sin telemetria ni pings de enlaces
rem  disable-default-apps      sin apps preinstaladas
rem  show-avatar-button=never  (propia de Thorium) quita el boton de perfil
set "COMUN=--no-first-run --no-default-browser-check --disable-breakpad --disable-domain-reliability --no-pings --disable-default-apps --show-avatar-button=never"

rem Funciones internas que se apagan en todos los modos:
rem  OptimizationHints, SegmentationPlatform   modelos y pistas en segundo plano
rem  NtpFooter           la franja de abajo en la nueva pestana
rem  Glic, LensOverlay, Compose, HistoryEmbeddings, AutofillAi   funciones de IA
rem  BrowsingTopics, Fledge   sistema de anuncios integrado en el motor
rem  ShoppingList        seguimiento de precios
rem  DisableLoadExtensionCommandLineSwitch   permite cargar Liviano desde aca
set "FUERA=OptimizationHints,SegmentationPlatform,NtpFooter,Glic,LensOverlay,Compose,HistoryEmbeddings,AutofillAi,BrowsingTopics,Fledge,ShoppingList,DisableLoadExtensionCommandLineSwitch"
set "EXTRA="

if /i "%MODO%"=="eco" goto :eco
if /i "%MODO%"=="extremo" goto :extremo
goto :pro

:eco
rem Menos procesos y menos movimiento: ahorra RAM, CPU y bateria.
rem  SpareRendererForSitePerProcess   proceso de reserva que ocupa RAM sin usarse
set "FUERA=%FUERA%,MediaRouter,SpareRendererForSitePerProcess"
set "EXTRA=--process-per-site --disable-smooth-scrolling --force-prefers-reduced-motion"
goto :lanzar

:pro
rem No recorta nada visible; suma descargas en paralelo.
set "EXTRA=--enable-features=ParallelDownloading"
goto :lanzar

:extremo
rem Todo lo de Eco, mas un tope de procesos y sin traductor ni transmision a
rem otros dispositivos.
rem (No se usa --enable-low-end-device-mode: en PC deja zonas sin pintar y
rem  colores corridos, porque dibuja con texturas de baja calidad.)
rem  BackForwardCache      no guarda en RAM las paginas de las que saliste
rem  GlobalMediaControls   quita el boton de control de medios de la barra
set "FUERA=%FUERA%,MediaRouter,SpareRendererForSitePerProcess,Translate,BackForwardCache,GlobalMediaControls"
set "EXTRA=--process-per-site --renderer-process-limit=4 --disable-smooth-scrolling --force-prefers-reduced-motion"
rem Si la placa de video es muy vieja y la pantalla parpadea, quita el "rem":
rem set "EXTRA=%EXTRA% --disable-gpu"
goto :lanzar

:lanzar
if defined VER goto :ver
start "" "%NAV%" --load-extension="%EXT%" %COMUN% --disable-features=%FUERA% %EXTRA% %RESTO%
exit /b 0

:ver
echo Navegador: %NAV%
echo Modo del motor: %MODO%
echo Opciones: --load-extension="%EXT%" %COMUN% --disable-features=%FUERA% %EXTRA% %RESTO%
exit /b 0

:mostrar
rem Vuelve a abrirse en una ventana visible para poder preguntar.
start "Liviano" cmd /c ""%~f0""
exit /b 0

rem --- Modo: que quedo elegido adentro del navegador --------------------------
:leer_modo
rem Liviano, al cambiar de modo, deja dos ajustes guardados en el perfil:
rem   precarga apagada              -> Eco o Extremo
rem   traductor apagado             -> Extremo
rem Se leen de ahi para no preguntar nada al abrir.
set "PREFS="
for %%F in ("%NAV%") do set "EXE=%%~nxF"
if /i "%EXE%"=="thorium.exe" set "PREFS=%LOCALAPPDATA%\Thorium\User Data\Default\Secure Preferences"
if /i "%EXE%"=="chrome.exe" set "PREFS=%LOCALAPPDATA%\Chromium\User Data\Default\Secure Preferences"
if not defined PREFS goto :modo_recomendado
if not exist "%PREFS%" goto :modo_recomendado
rem Si Liviano todavia no corrio en ese perfil, vale el modo recomendado.
findstr /l /m /c:"\"dnr_use_action_count_as_badge_text\":true" "%PREFS%" >nul 2>nul
if errorlevel 1 goto :modo_recomendado
set "MODO=pro"
findstr /l /m /c:"\"net.network_prediction_options\":2" "%PREFS%" >nul 2>nul
if not errorlevel 1 set "MODO=eco"
findstr /l /m /c:"\"translate.enabled\":false" "%PREFS%" >nul 2>nul
if not errorlevel 1 set "MODO=extremo"
exit /b

:modo_recomendado
findstr /l /c:"eco" "%EXT%\launch.json" >nul 2>nul
if not errorlevel 1 set "MODO=eco"
findstr /l /c:"extremo" "%EXT%\launch.json" >nul 2>nul
if not errorlevel 1 set "MODO=extremo"
exit /b

:recomendar
rem Hasta 4 GB de memoria: Extremo. Hasta 8 GB: Eco. Mas: Pro.
set "RAM="
for /f %%R in ('powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB)"') do set "RAM=%%R"
set "RECO=pro"
if not defined RAM goto :reco_fin
if %RAM% LEQ 8 set "RECO=eco"
if %RAM% LEQ 4 set "RECO=extremo"
:reco_fin
> "%EXT%\launch.json" echo {"mode":"%RECO%"}
exit /b

rem --- Deteccion e instalacion del navegador ----------------------------------
:detectar
set "NAV="
if exist "%AQUI%navegador.txt" set /p NAV=<"%AQUI%navegador.txt"
call :buscar "%LOCALAPPDATA%\Thorium\Application\thorium.exe"
call :buscar "%ProgramFiles%\Thorium\Application\thorium.exe"
call :buscar "%ProgramFiles(x86)%\Thorium\Application\thorium.exe"
call :buscar_registro HKCU thorium.exe
call :buscar_registro HKLM thorium.exe
call :buscar "%LOCALAPPDATA%\Chromium\Application\chrome.exe"
call :buscar "%ProgramFiles%\Chromium\Application\chrome.exe"
call :buscar "%ProgramFiles(x86)%\Chromium\Application\chrome.exe"
exit /b

:buscar
if defined NAV exit /b
if exist "%~1" set "NAV=%~1"
exit /b

:buscar_registro
if defined NAV exit /b
for /f "tokens=2,*" %%A in ('reg query "%~1\Software\Microsoft\Windows\CurrentVersion\App Paths\%~2" /ve 2^>nul ^| find /i "REG_SZ"') do if exist "%%B" set "NAV=%%B"
exit /b

:ofrecer_instalar
rem Instala Thorium con winget (el instalador de paquetes de Windows), que
rem comprueba que el archivo descargado sea exactamente el publicado.
where winget >nul 2>nul
if errorlevel 1 exit /b
rem Elige la version segun esta PC (procesador, 32/64 bits, Windows).
set "PAQ="
set "MOTIVO="
for /f "usebackq tokens=1,* delims=|" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%AQUI%liviano-cpu.ps1"`) do (
  set "PAQ=%%P"
  set "MOTIVO=%%Q"
)
if not defined PAQ exit /b
echo.
echo  No encontre Thorium ni Chromium en esta PC.
if /i "%PAQ%"=="NO" goto :no_instalable
echo  Puedo instalar Thorium ahora. Esto es lo que se va a descargar:
echo.
echo    Paquete: %PAQ%
echo    Elegido porque %MOTIVO%
winget show --id %PAQ% --exact --source winget --disable-interactivity 2>nul | findstr /i /r /c:"^Versi" /c:"URL del instalador" /c:"Installer Url"
echo.
echo  Mira la direccion de descarga de arriba: un navegador maneja tus
echo  contrasenas, asi que instalalo solo si confias en ese origen.
echo.
choice /c SN /n /m " Instalar Thorium ahora? [S/N] "
if errorlevel 2 exit /b
if not errorlevel 1 exit /b
echo.
winget install --id %PAQ% --exact --source winget
call :detectar
exit /b

:no_instalable
echo  No lo puedo instalar automaticamente:
echo  %MOTIVO%
exit /b

:sin_navegador
if defined OCULTO goto :mostrar
echo.
echo  No hay Thorium ni Chromium para abrir.
echo.
echo  - Para instalarlo desde aca, volve a abrir Liviano y responde S.
echo  - O instalalo a mano desde https://thorium.rocks
echo  - Si ya lo tenes en otra carpeta o es portable, crea un archivo llamado
echo    navegador.txt al lado de este, con la ruta completa del .exe adentro.
echo.
pause
exit /b 1
