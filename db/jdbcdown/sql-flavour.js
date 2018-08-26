'use strict';

var sqlFlavour;

function setSqlFlavourByJdbcUrl(jdbcUrl)
{
	if ((jdbcUrl.startsWith("jdbc:h2")) ||
		(jdbcUrl.startsWith("jdbc:mysql"))) {
		sqlFlavour = "mysql";
	}
	else {
		sqlFlavour = "postgres";
	}
}

function getDBEngineDefinition()
{
	switch (sqlFlavour) {
		case "mysql":
 			return 'ENGINE=InnoDB';
		case "postgres":
			return '';
		default:
			return '';
    }
}

function sqlForOnDuplicateKey(constraintName)
{
	switch (sqlFlavour) {
		case "mysql":
			return "ON DUPLICATE KEY UPDATE";
		case "postgres":
			return 'ON CONFLICT ON CONSTRAINT ' + constraintName + ' DO UPDATE SET';
		default:
			return '';
    }
}

function blobType()
{
	switch (sqlFlavour) {
		case "mysql":
			return "BLOB";
		case "postgres":
			return "TEXT";
		default:
			return "";
	}
}

function isUsingEncoding()
{
	switch (sqlFlavour) {
		case "mysql":
			return true;
		case "postgres":
			return false;
		default:
			return true;
    }
}

function fieldName(name)
{
	switch (sqlFlavour) {
		case "mysql":
			return name.toUpperCase();
		case "postgres":
			return name.toLowerCase();
		default:
			return name;
	}
}

exports.setSqlFlavourByJdbcUrl = setSqlFlavourByJdbcUrl;
exports.getDBEngineDefinition = getDBEngineDefinition;
exports.sqlForOnDuplicateKey = sqlForOnDuplicateKey;
exports.blobType = blobType;
exports.isUsingEncoding = isUsingEncoding;
exports.fieldName = fieldName;
