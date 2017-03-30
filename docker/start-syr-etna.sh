if [ "$(ls -A /config/nodelocal.js)" ]; then
  cp -f /config/nodelocal.js .
fi
if [ "$(ls -A /config/devLicence.json)" ]; then
  mkdir -p devLic
  cp -f /config/devLicence.json ./devLic/license.json
fi

node .