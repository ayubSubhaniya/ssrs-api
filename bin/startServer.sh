#!/usr/bin/env bash
# Script to start the server on macOS/UNIX platforms

pm2 stop all

# Here last word of command is the number of CPUs to be used.
# use 'max'   - for all using all CPUs
#     '-1'    - for all CPUs minus 1    
pm2 start app.js --time --log logs/pm2_logs.log -i 1
