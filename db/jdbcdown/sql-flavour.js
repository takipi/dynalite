'use strict';

var util = require('./encoding');
var sqlFlavour;

function setSqlFlavourByJdbcUrl(jdbcUrl)
{
	if ((jdbcUrl.startsWith("jdbc:h2")) ||
		  (jdbcUrl.startsWith("jdbc:mysql"))) {
		sqlFlavour = "mysql";
	} else if (jdbcUrl.startsWith("jdbc:oracle")) {
		sqlFlavour = "oracle";
	} else {
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

function sqlHasSupportForUpsertWithOnDup()
{
	switch (sqlFlavour) {
		case "oracle": return false;
		default: return true;
	}
}

function sqlIfNotExists()
{
	switch (sqlFlavour) {
		case "oracle": return "";
		default: return "IF NOT EXISTS";
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
			return "BYTEA";
		case "oracle":
			return "BLOB";
		default:
			return "";
	}
}

function fieldName(name)
{
	switch (sqlFlavour) {
		case "mysql":
		case "oracle":
			return name.toUpperCase();
		case "postgres":
			return name.toLowerCase();
		default:
			return name;
	}
}

function castValueIfRequired(value)
{
	switch (sqlFlavour) {
		case "mysql":
			return value;
		case "postgres":
			return "CAST(" + value + " AS TEXT)";
		default:
			return value;
	}
}

function limit(value)
{
	switch (sqlFlavour) {
		case "oracle":
			return "FETCH FIRST " + value + " ROWS ONLY";
		case "mysql":
		case "postgres":
			return "limit " + value;
		default:
			return value;
	}
}

exports.setSqlFlavourByJdbcUrl = setSqlFlavourByJdbcUrl;
exports.getDBEngineDefinition = getDBEngineDefinition;
exports.sqlForOnDuplicateKey = sqlForOnDuplicateKey;
exports.blobType = blobType;
exports.fieldName = fieldName;
exports.castValueIfRequired = castValueIfRequired;
exports.sqlHasSupportForUpsertWithOnDup = sqlHasSupportForUpsertWithOnDup;
exports.sqlIfNotExists = sqlIfNotExists;
exports.limit = limit;
