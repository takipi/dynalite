#!/bin/bash

declare -r script_dir=`cd "$( dirname "$0" )" && pwd`

function generate_trireme_classpath()
{
	for jarFile in $script_dir/libs/*.jar; do
		echo "$jarFile:"
	done
}

function goto_dynalite_home()
{
	while [ ! -r cli.js ]; do
		cd ..
		
		if [ "$(pwd)" == "$(dirname `pwd`)" ]; then
			echo "Unable to find dynalite home"
			return 1
		fi
	done
	
	return 0
}

function main()
{
	local trireme_classpath=$(generate_trireme_classpath)
	
	echo "About to run: "
	echo trireme cli.js $@
	echo "Trireme classpath is: $trireme_classpath"
	
	export TRIREME_CLASSPATH="$trireme_classpath"
	
	if ! goto_dynalite_home; then
		exit 1
	fi
	
	trireme cli.js $@
}

main $@
