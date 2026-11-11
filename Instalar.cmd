@echo off
setlocal EnableExtensions
rem Crea el acceso "Liviano" en el Escritorio, apuntando a esta carpeta.
rem Si moves la carpeta, volve a ejecutar este archivo.

set "AQUI=%~dp0"
powershell -NoProfile -Command "$d = $env:AQUI.TrimEnd('\'); $q = [char]34; $s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Liviano.lnk'); $s.TargetPath = $env:WINDIR + '\System32\cmd.exe'; $s.Arguments = '/c ' + $q + $q + $d + '\Liviano.cmd' + $q + ' /oculto' + $q; $s.WorkingDirectory = $d; $s.WindowStyle = 7; $s.IconLocation = $d + '\liviano.ico,0'; $s.Description = 'Liviano: navegador recortado'; $s.Save()"
if errorlevel 1 goto :fallo

echo.
echo  Listo: quedo el acceso "Liviano" en el Escritorio.
echo  Abrilo para empezar. Si no tenes Thorium, te va a ofrecer instalarlo.
echo.
pause
exit /b 0

:fallo
echo.
echo  No pude crear el acceso. Podes abrir Liviano.cmd directamente.
echo.
pause
exit /b 1
