#! /bin/bash

[ -z "$TELEGRAMMER_PATH" ] && TELEGRAMMER_PATH="./index.js"
node "$TELEGRAMMER_PATH" "$@"
