# Elige el paquete de Thorium (en winget) que corresponde a esta PC.
# Lo usa Liviano.cmd cuando ofrece instalar el navegador.
# Salida: una sola linea "PAQUETE|motivo", o "NO|motivo" si esta PC no sirve.

$arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
if ([Environment]::OSVersion.Version.Major -lt 10) {
  'NO|Thorium necesita Windows 10 o mas nuevo.'
  return
}
if ($arch -eq 'ARM64') {
  'NO|Tu PC usa un procesador ARM; esa version de Thorium se baja a mano desde https://thorium.rocks'
  return
}
if ($arch -ne 'AMD64') {
  'NO|Tu Windows es de 32 bits y Thorium solo tiene version de 64 bits.'
  return
}

$cpu = Add-Type -PassThru -Namespace Liviano -Name Cpu -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(uint feature);'

# De la mas rapida a la mas compatible: cada version usa instrucciones que
# los procesadores mas viejos no tienen.
if ($cpu::IsProcessorFeaturePresent(40)) { 'Alex313031.Thorium.AVX2|tu procesador soporta AVX2 (la version mas rapida)' }
elseif ($cpu::IsProcessorFeaturePresent(37)) { 'Alex313031.Thorium.SSE4|tu procesador no tiene AVX2 pero si SSE4' }
elseif ($cpu::IsProcessorFeaturePresent(13)) { 'Alex313031.Thorium|tu procesador es antiguo: va la version SSE3, la mas compatible' }
else { 'NO|Tu procesador es demasiado antiguo para Thorium.' }
