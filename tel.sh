#! /bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE}")" ; pwd -P )

cd "$parent_path"

[ -z "$NODE_PATH" ] && NODE_PATH=`which node`
[ -z "$TELEGRAMMER_PATH" ] && TELEGRAMMER_PATH="./bin/telegrammer.js"
[ -z "$MAX_MEM" ] && MAX_MEM=128

"$NODE_PATH" "$TELEGRAMMER_PATH" "$@"
