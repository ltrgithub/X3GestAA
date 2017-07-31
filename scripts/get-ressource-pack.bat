REM *********************************
REM  %1 - URL SERVER INDUS
REM  %2 - DELIVERY PACK NAME
REM  %3 - OUTPUT FOLDER TO UNZIP
REM *********************************

setlocal enabledelayedexpansion

set SYR_INDUS_SRV=%~1

if "%SYR_INDUS_SRV%"=="" (
  echo "Please specify an INDUS server"
  exit /b 1
)

set DELIVERY=%~2

if "%DELIVERY%"=="" (
  echo "Please specify the ressource pack name"
  exit /b 1
)

set OUTPUT_FOLDER=%~3
  
if exist err.log del /F err.log
if exist %DELIVERY%.zip del /F %DELIVERY%.zip

echo "Download %DELIVERY%"
curl  -o %DELIVERY%.zip --http1.1 --compressed --basic -u JENKINS:JENKINS --get "%SYR_INDUS_SRV%/sdata/syracuse/collaboration/syracuse/resourcePacks(code%%20eq%%20%%27DELIVERY%%27)/$service/downloadContent?representation=resourcePack.$details&format=application/x-export" -H "Accept: application/json;vnd.sage=syracuse; charset=utf-8" -H "Accept-Language: en-US" -H "Accept-Encoding: gzip, deflate" -H "Content-Type: application/json" -o request.log --stderr err.log --trace-ascii trace.log -v
if "%OUTPUT_FOLDER%" NEQ "" (
  unzip -d %OUTPUT_FOLDER% -o %DELIVERY%.zip
  del /F %DELIVERY%.zip
)
 