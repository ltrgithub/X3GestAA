@echo off
set /p ok="You will lose all changes that have not been pushed to GitHub. Are you sure? " -n 1 -r
if /I "%ok%" NEQ "Y" GOTO :eof
set DIR=%~dp0
echo STEP 1: resetting node_modules
cd %DIR% & rmdir /s/q node_modules
git checkout node_modules
echo 
echo STEP 2: checking out submodules
git submodule init
git submodule update
echo 
echo STEP 3: running npm install (may take a while)
rem Use --production flag to avoid problems with grunt s very long file paths on windows
cmd /C npm install --production
cd %DIR%\node_modules\ez-mailer & cmd /C npm install
cd %DIR%\node_modules\streamline-upload & cmd /C npm install
cd %DIR%\node_modules\syracuse-phantomjs & cmd /C npm install
echo 
echo STEP 4: running npm dedup (may take a while)
cd %DIR% & cmd /C npm dedup
echo 
echo STEP 5: running npm-shadow
cd %DIR%\node_modules & node npm-shadow
echo 
echo STEP 6: resetting node_modules (again)
cd %DIR% & rmdir /s/q node_modules
git checkout node_modules
echo 
echo STEP 7: checking out submodules (again)
git submodule init
git submodule update
