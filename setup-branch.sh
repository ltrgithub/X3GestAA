#!/bin/sh
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR; 
git submodule init
git submodule update
cd $DIR/node_modules
for dir in ez-mongodb ez-streams galaxy jsurl streamline-doctool streamline-flamegraph streamline-fs \
	streamline-pdfkit streamline-plugin streamline-require streamline-runtime; do
		echo "git checkout in " $dir
		cd $DIR/node_modules/$dir
		git checkout .
done;
cd $DIR/node_modules
npm install babel-core
for dir in streamline-plugin commander source-map; do
		echo "npm install in " $dir
		cd $DIR/node_modules/$dir
		npm install
done;
