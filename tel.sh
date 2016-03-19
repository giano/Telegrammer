#! /bin/bash

[ -z "$NODE_PATH" ] && NODE_PATH=`which node`
[ -z "$TELEGRAMMER_PATH" ] && TELEGRAMMER_PATH="./index.js"
[ -z "$MAX_MEM" ] && MAX_MEM=256

"$NODE_PATH" --max-old-space-size="$MAX_MEM" "$TELEGRAMMER_PATH" "$@"
