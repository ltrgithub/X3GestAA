if [ "$(ls -A /config/nodelocal.js)" ]; then
  cp -f /config/nodelocal.js .
fi
if [ "$(ls -A /config/devLic)" ]; then
  cp -Rf /config/devLic .
fi

node .