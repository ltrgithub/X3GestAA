REM Create a combined setup from files
REM - dotnet\SyracuseAddinsSetup\Release\setup.exe
REM - dotnet\SyracuseAddinsSetup\Release\SyracuseAddinsSetup.msi
REM Output is written to node_modules\msoffice\lib\general\addIn\SyracuseOfficeAddinsSetup.EXE
REM This cmd must be started as administrator and in mode for 32-bit 
REM
C:\Windows\SysWOW64\iexpress.exe /N C:\dev\syracuse\git\Syracuse\dotnet\SyracuseAddinsSetup\SyracuseOfficeAddinsSetup_for_MW.SED