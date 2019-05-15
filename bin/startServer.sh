#!/usr/bin/env bash

# Here '3' is the number of CPUs to be used.
# use 'max'   - for all using all CPUs
#     '-1'    - for all CPUs minus 1    
pm2 start app.js -i 1