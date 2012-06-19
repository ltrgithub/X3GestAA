DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR/node_modules/pdfkit/node_modules/flate;  node-waf configure; node-waf build
cd $DIR/node_modules/fibers; npm install
cd $DIR/node_modules/node-db-oracle; node-waf configure; node-waf build
cd $DIR/node_modules/node-db-mysql; node-waf configure;node-waf build
