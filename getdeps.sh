#!/usr/bin/env bash

yarn
yarn run npmpd
yarn install --production=true --modules-folder=nmodules
