#!/usr/bin/env bash

yarn
yarn run npmpd
yarn install --production=true --modules-folder=nmodules
yarn list | grep nw-builder
yarn upgrade nw-builder
yarn list | grep nw-builder

