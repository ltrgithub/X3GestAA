if [ "$(ls -A /config/nodelocal.js)" ]; then
  cp -f /config/nodelocal.js .
fi
if [ "$(ls -A /config/devLicense.json)" ]; then
  mkdir -p devLic
  cp -f /config/devLicense.json ./devLic/license.json
fi

node .
