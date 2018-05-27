#!/bin/bash

declare temp_dir=`mktemp -d /tmp/dynamite-XXXXXXXX`
declare temp_mapping_file=`mktemp /tmp/dynamite-mapping-fileXXXX`

echo '{' \
'  "dude1": "1",' \
'  "dude2": "1",' \
'  "dude3": "2",' \
'  "dude4": "2",' \
'  "dude5": "2",' \
'  "dude6": "3",' \
'  "dude7": "3",' \
'  "dude8": "4",' \
'  "dude9": "5",' \
'  "dude10": "6",' \
'  "dude11": "6",' \
'  "dude12": "7",' \
'  "dude13": "7",' \
'  "dude14": "8",' \
'  "dude15": "9",' \
'  "dude16": "10",' \
'  "default": "0"' \
'}' >> $temp_mapping_file

declare temp_pid_file=".temp_pids"

if [ -r "$temp_pid_file" ]; then
	kill -9 `cat $temp_pid_file`
fi

rm "$temp_pid_file"

echo "Starting"
echo "  Temp dir: $temp_dir"
echo "  Mapping file: $temp_mapping_file"

nohup ./cli.js --dbPerTable --port 4001 --path "$temp_dir/4001" &
echo "$!" >> "$temp_pid_file"
nohup ./cli.js --dbPerTable --port 4002 --path "$temp_dir/4002" &
echo "$!" >> "$temp_pid_file"
nohup ./cli.js --dbPerTable --port 4003 --path "$temp_dir/4003" &
echo "$!" >> "$temp_pid_file"
nohup ./cli.js --dbPerTable --port 4004 --path "$temp_dir/4004" &
echo "$!" >> "$temp_pid_file"

./dynamite-proxy.js --port 4000 --dynamite 4 --tablesMappingPath $temp_mapping_file
