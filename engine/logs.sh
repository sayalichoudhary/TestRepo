# Script to filter logs
# Created by API Defender on 12/05/2016
# @version 1.0

#! /bin/bash

# Prints the output of a command.
printOutput () {
    currentTime=$(date +"%Y-%m-%d %T")
    if [[ ! -z $2 ]]; then
        echo [$currentTime] [$1] - $2
    else
        echo [$currentTime] [$1] - SUCCESSFUL
    fi
}

path=/home/ec2-user/code/mobileasap_tiengine/ti_engine/logs

# Create a history directory if it does not exist.
mkdir -p $path/history

# Remove all hourly log files except the latest.
result=$(rm $path/realtime.log[0-9]* 2>&1)

# Call function 'printOutput' to print the output of the command.
printOutput "Remove realtime.log[0-9]* files" "$result"

today=$(date +"%Y-%m-%d")

# compress all log files older than a day and remove the original file
for fn in $path/application-*.log; do
    date=$(echo $fn |grep -Eo '[[:digit:]]{4}-[[:digit:]]{2}-[[:digit:]]{2}')
    if [[ "$fn" < "$path/application-${today}.log" ]]; then
        result=$(tar -czvf $path/application-$date.tar.gz $fn --remove-files 2>&1)
        printOutput "For loop tar command" "$result"
    fi
done

maxdate=$(date -d "7 days ago" "+%Y-%m-%d");

# move all the compressed .tar.gz files older than 1 week to the history directory
for fn in $path/*.tar.gz; do
    if [[ "$fn" < "$path/application-${maxdate}.tar.gz" ]]; then
        result=$(mv $fn $path/history 2>&1)
        printOutput "For loop mv command" "$result"
    fi
done

# use logrotate to rotate crontabLogs
#logRes=$(sudo /usr/sbin/logrotate /etc/logrotate.d/crontabLogConf -vf 2>&1)
#printOutput "Run logrotate" "$logRes"

exit 0

