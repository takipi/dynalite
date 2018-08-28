'use strict';
var jdbc = require('trireme-jdbc');
var inherits = require('inherits');
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN;
var Iter = require('./iterator');
var fs = require('fs');
var Promise = require('bluebird');
var url = require('url');
// Todo: break to one meta-table for tables and separate tables for each dynamo table.
// Currently, everything is on one table
var util = require('./encoding');
var sql = require('./sql-flavour');
module.exports = JDBCdown;

var poolMap = {};

inherits(JDBCdown, AbstractLevelDOWN);

function JDBCdown(jdbcUrl, jdbcUser, jdbcPassword, tableName, dbPerTable, connectionPoolMaxSize) {
    AbstractLevelDOWN.call(this, jdbcUrl);

    this.pool = initPool(jdbcUrl, jdbcUser, jdbcPassword, tableName, dbPerTable, connectionPoolMaxSize);
    this.tableName = tableName;
    sql.setSqlFlavourByJdbcUrl(jdbcUrl);
}

JDBCdown.prototype._open = function(options, callback) {
    var tableCreateStr = 'CREATE TABLE IF NOT EXISTS ' + this.tableName + '(' +
        'K VARCHAR(767) NOT NULL, V ' + sql.blobType() + ', CONSTRAINT ' + this.tableName + '_PK PRIMARY KEY(K)) ' +
        sql.getDBEngineDefinition();

    this.pool.execute(tableCreateStr,
        function(err, result) {
            if (err) {
                console.error(err);
            }
            
            callback();
        });
}

JDBCdown.destroy = function(location, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    // unsupported so we don't accidently destory our data:
    //
    // this.pool.execute('drop table if exists ' + this.tableName,
    //     function(err, result) {
    //         if (err) {
    //             console.log("ERROR:" + err)
    //         };
    //         callback();
    //     });
};


JDBCdown.prototype._get = function(key, options, cb) {
    var self = this;
    var asBuffer = true;
    if (options.asBuffer === false) {
        asBuffer = false;
    }
    if (options.raw) {
        asBuffer = false;
    }
    key = util.encode(key);

    this.pool.execute("SELECT V FROM " + this.tableName + " WHERE K = ?", [key], function(err, res, rows) {
        if (err) {
            console.error(err);
            return cb(new Error("Error occurred"));
        }
        if (rows === undefined) {
            return cb(new Error('NotFound'));
        }
        if (rows.length === 0) {
            return cb(new Error('NotFound'));
        }

        try {
            rows.forEach(function(row) {
                var value = row[sql.fieldName('v')];
                if (value === undefined || value === null) {
                    return cb(new Error('NotFound'));
                }
                // protoect
                var decodedVal = util.decode(value, asBuffer, true);
                cb(null, decodedVal);
            });
        } catch (e) {
            console.error(e);
            cb(new Error('NotFound'));
        }
    });
}

JDBCdown.prototype._put = function(key, value, opt, cb) {
    value = util.encode(value, true);
    key = util.encode(key);

    insertHelper(this.pool, cb, key, value, this.tableName);
}


JDBCdown.prototype._del = function(key, opt, cb) {
    var self = this;
    key = util.encode(key);
    deleteHelper(this.pool, cb, key, this.tableName);
}

function unique(array) {
    var things = {};
    array.forEach(function(item) {
        things[item.key] = item;
    });
    return Object.keys(things).map(function(key) {
        return things[key];
    });
}

JDBCdown.prototype._batch = function(array, options, callback) {
    var self = this;
    var inserts = 0;
      this.pool.beginTransaction(function(err, tran) {
          if (err) {
            console.error(err);
          }
          return Promise.all(unique(array).map(function(item) {
              var key = util.encode(item.key);

              if (item.type === 'del') {
                  return deleteHelper(tran, function() {}, key, self.tableName);
              } else {
                  var value = util.encode(item.value, true);
                  inserts++;
                  return insertHelper(tran, function() {}, key, value, self.tableName);
              }
          })).then(function() {
              tran.commit(function(err) {
                  if (err) {
                      console.log(err)
                  }

                    callback();
              });
          });
      });
}


JDBCdown.prototype._close = function(callback) {
    console.log('closing connection');
    this.pool.close();
};

JDBCdown.prototype.iterator = function(options) {
    return new Iter(this, options);
};

function initPool(url, user, password, tableName, dbPerTable, connectionPoolMaxSize) {
    
    var keyStore;

    if (!dbPerTable)
    {
        keyStore = "all";
    }
    else 
    {
        keyStore = tableName;
        var parts = url.split(";");
        parts[0] = parts[0] + "_" + tableName;
        url = parts.join(";");  
    }
    
    var pool = poolMap[keyStore];
    
    if(pool)
    {
        return pool;
    }
    
    if (!connectionPoolMaxSize)
    {
        connectionPoolMaxSize = dbPerTable ? 10 : 30;
    }
    
    var extraVendorProperties = {};
    
    if (url.includes("jdbc:mysql")) {
        extraVendorProperties = {
            useSSL: false,
            createDatabaseIfNotExist: true,
            connectTimeout: 15000,
            useLocalSessionState: true,
            useLocalTransactionState: true,
            cachePrepStmts: true,
            useServerPrepStmts: true,
            prepStmtCacheSize: 250,
            prepStmtCacheSqlLimit: 2048,
            rewriteBatchedStatements: true,
            autoReconnect: true
        }
    }
    
    var vendorProperties = Object.assign({}, extraVendorProperties, {
        user: user,
        password: password
    });
    
    var jdbcProps = {
        url: url,
        properties: vendorProperties,
        minConnections: 0,
        maxConnections: connectionPoolMaxSize,
        idleTimeout: 600
    };
    
    console.log('Connecting to ' + url + ' with user: ' + user + ', table: ' + tableName);
    console.log("Configuration: " + JSON.stringify(jdbcProps));
    
    pool = new jdbc.Database(jdbcProps);
    
    poolMap[keyStore] = pool;
    
    console.log('successfully created pool');
    
    return pool;
}

function insertHelper(db, cb, key, value, tableName) {
    db.execute("INSERT INTO " + tableName + " (K, V) VALUES (?,?) " + sql.sqlForOnDuplicateKey(tableName + "_PK") + " V=?", [key, value, value], function(err) {
        if (err) {
            console.error(err)
        }
        cb();
    });
}

function deleteHelper(db, cb, key, tableName) {
    db.execute("DELETE FROM " + tableName + " where K=?", [key], function(err) {
        if (err) {
            console.error(err);
        }

        cb();
    });
}
