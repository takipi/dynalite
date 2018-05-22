const TABLE_NAME_HEADER = "x-table-name";

var argv = require('minimist')(process.argv.slice(2))

var fs = require("fs");
var content = fs.readFileSync(argv.map);
var tableNamesMapping = JSON.parse(content);

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
