if [ "$(ls -A /config/nodelocal.js)" ]; then
  cp -f /config/nodelocal.js .
fi

node . --dbUnlockAll