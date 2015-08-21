#!/bin/sh
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR; 
git submodule init
git submodule update
cd $DIR/node_modules
npm install babel-core streamline-plugin commander source-map
