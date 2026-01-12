#!/bin/sh

autocannon -a 4000 -c 700 -m POST -i ./loadtest/data.json \
  -H "Content-Type:application/json" \
  -H "x-api-key: api_key_value" \
  http://localhost:8787/new-events
