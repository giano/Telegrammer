#!/bin/bash

if[ $USER == "root" ];then
  reboot;
else
  sudo reboot;
fi
