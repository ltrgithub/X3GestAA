#!/bin/sh
if [ "$(uname)" == "Darwin" ]; then
	ND="darwin"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    ND="linux"
elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ]; then
    ND="win32"
fi
ND="nodejs/"$ND"_x64/node"
echo "Node version:" $($ND -v)
$ND $*
