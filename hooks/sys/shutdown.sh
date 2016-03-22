#!/bin/bash

if [ "$USER" == "root" ]; then
  poweroff;
else
  sudo poweroff;
fi
