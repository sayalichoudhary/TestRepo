# Script to start the API defender using pm2
# Created by API Defender on 12/05/2016
# @version 1.0

# /usr/local/sbin/daemonize -E BUILD_ID=dontKillMe /usr/bin/pm2 app.js
pm2 start app.js