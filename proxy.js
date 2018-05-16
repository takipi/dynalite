const TABLE_NAME_HEADER = "x-table-name";

var argv = require('minimist')(process.argv.slice(2))

var http = require('http'),
    httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({});
var port = argv.port;
var dynamiteCount = argv.dynamite;

var server = http.createServer(function(req, res) {
  var tableName = req.headers[TABLE_NAME_HEADER];

  proxy.web(req, res, { target: 'http://127.0.0.1:' + calcPort(port, tableName, dynamiteCount) },
  	function(error) {
  		console.error(error);
  	});
});

console.log("Proxy listening on port " + argv.port);
server.listen(argv.port);


// mapping
var tableNamesMapping = {};
tableNamesMapping["onprem_flash_hits"] = 1;
tableNamesMapping["onprem_services2_debug"] = 1;

tableNamesMapping["onprem_source_code"] = 2;
tableNamesMapping["onprem_hits"] = 2;
tableNamesMapping["onprem_classes_seen"] = 2;

tableNamesMapping["onprem_jars"] = 3;
tableNamesMapping["onprem_jars_pending_apps"] = 3;

tableNamesMapping["onprem_requests"] = 4;
tableNamesMapping["onprem_counters"] = 5;
tableNamesMapping["onprem_protobuffer_elements_references"] = 6;
tableNamesMapping["onprem_service_jars"] = 6;

tableNamesMapping["onprem_tinykeys"] = 7;
tableNamesMapping["onprem_applications"] = 7;

tableNamesMapping["onprem_zeuson_class_bytes"] = 8;
tableNamesMapping["onprem_requests_checksum"] = 9;
tableNamesMapping["onprem_request_stats_pending"] = 10;

tableNamesMapping["default"] = 0;

calcPort = function(port, tableName, dynamiteCount) {
	let mapping;

	if (tableName) {
		mapping = tableNamesMapping[tableName.toLowerCase()];
	}

	if (!mapping) {
		mapping = tableNamesMapping["default"];
	}
	
	let offset = mapping % dynamiteCount + 1;

	return port + offset;
}
