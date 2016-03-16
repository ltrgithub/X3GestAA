## ez-streams wrapper for _tedious_ driver (SQL server)

`var eztedious = require('ez-tedious');`

* `reader = eztedious.reader(connection, sql, args)`   
* `writer = eztedious.writer(connection, sql, columnDefs)`
connection : a sql connection (created by require('tedious').Connection(...))
sql : the sql statement (sth like INSERT INTO)
columnDefs : a structure that describes the metadata of each parameter
  should look like { "@p0" : xxx, "@p1" : yyy, ...} where xxx and yyy are objects created 
by sqlserver.readTableSchema(...)
