#!/bin/bash

# Remove previous build
echo "cleaning..."
#rm -rf ./*.d.ts ./*.js ./*.map ./dist/* #./build/*
rm -rf ./dist/* #./build/*


# Compile typescript to javascript (configured by tsconfig.json)
echo "compiling typescript..."
npx tsc


# Lint source code
#echo "linting source code..."
#npx eslint . --ext .js,.ts


# Bundle compiled javascript and libraries
echo "bundling javascript..."

if [ $1 ]; then
  LEVEL=$1
else
  LEVEL="SIMPLE"
  #LEVEL="WHITESPACE_ONLY"
fi

PRETTY_PRINT="--formatting PRETTY_PRINT"

npx google-closure-compiler                               \
  --compilation_level $LEVEL                              \
  $PRETTY_PRINT                                           \
  --charset UTF-8                                         \
  --isolation_mode IIFE                                   \
  --assume_function_wrapper true                          \
  --dependency_mode PRUNE                                 \
  --process_common_js_modules true                        \
  --module_resolution NODE                                \
  --language_in ECMASCRIPT_2017                           \
  --language_out ECMASCRIPT5_STRICT                       \
  --env BROWSER                                           \
  --rewrite_polyfills false                               \
  --js_output_file ./dist/index.js                        \
  --entry_point build/main                                \
  --js ./build/*/*.js                                     \
  --js ./build/*.js                                       \
  --js ./node_modules/@spissvinkel/maths/*.js             \
  --js ./node_modules/@spissvinkel/alea/*.js              \
  --js ./node_modules/@spissvinkel/simplex-noise/*.js


# Prepare HTML, CSS and other resources
echo "preparing web resources..."
mkdir ./dist/fnt
mkdir ./dist/gfx
cp    ./web/*.html    ./dist
cp    ./web/*.css     ./dist
cp -r ./web/fnt/*     ./dist/fnt
cp -r ./web/gfx/*.png ./dist/gfx
