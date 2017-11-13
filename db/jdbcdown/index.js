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
module.exports = JDBCdown;

// db pool shared by all different instances
var pool;

inherits(JDBCdown, AbstractLevelDOWN);

function JDBCdown(jdbcUrl, jdbcUser, jdbcPassword, tableName) {
    AbstractLevelDOWN.call(this, jdbcUrl);

    initPool(jdbcUrl, jdbcUser, jdbcPassword);
    this.pool = pool;
    this.tableName = tableName;;
}

JDBCdown.prototype._open = function(options, callback) {
    var tableCreateStr = 'CREATE TABLE IF NOT EXISTS ' + this.tableName + '(' +
        'K VARCHAR(3072) NOT NULL, V BLOB, PRIMARY KEY(K)) ' +
        'ENGINE=InnoDB';

    this.pool.execute(tableCreateStr,
        function(err, result) {
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
            return cb(err.stack);
        }
        if (rows === undefined) {
            return cb(new Error('NotFound'));
        }
        if (rows.length === 0) {
            return cb(new Error('NotFound'));
        }

        try {
            rows.forEach(function(row) {
                var value = row.V;

                if (value === undefined || value === null) {
                    return cb(new Error('NotFound'));
                }
                // protoect
                var decodedVal = util.decode(value, asBuffer, true);
                cb(null, decodedVal);
            });
        } catch (e) {
            console.log(e);
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
              });
              callback();
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

function initPool(url, user, password) {
    
    if (pool)
    {
      return;
    }
    
    console.log('connecting to ' + url + ' with user: ' + user);
    
    pool = new jdbc.Database({
        url: url,
        properties: {
            user: user,
            password: password,
        },
        minConnections: 1,
        maxConnections: 30,
        idleTimeout: 60
    });
    
    console.log('successfully created pool');
}

function insertHelper(db, cb, key, value, tableName) {
    db.execute("INSERT INTO " + tableName + " (K, V) VALUES (?,?) ON DUPLICATE KEY UPDATE V=?", [key, value, value], function(err) {
        if (err) {
            console.log(err)
        }
        cb();
    });
}

function deleteHelper(db, cb, key, value, tableName) {
    db.execute("DELETE FROM " + tableName + " where K=?", [key], function(err) {
        if (err) {
            console.log(err);
        }

        cb();
    });
}