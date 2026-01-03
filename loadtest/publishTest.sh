#!/bin/sh

autocannon -a 5000 -c 600 -m POST -i ./loadtest/data.json \
  -H "Content-Type:application/json" \
  -H "x-api-key: test" \
  https://holding-theload.tiagorosadacost.workers.dev/new-events
