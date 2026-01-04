#!/bin/sh

autocannon -a 5000 -c 600 -m POST -i ./loadtest/data.json \
  -H "Content-Type:application/json" \
  -H "x-api-key: api_key_value_here" \
  https://holding-theload.tiagorosadacost.workers.dev/new-events
