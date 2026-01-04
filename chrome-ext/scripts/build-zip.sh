#!/bin/bash
cd chrome-ext
zip -r ../fbleadspro.zip * -x "node_modules/*"
echo "✅ Extension zipped as fbleadspro.zip"
