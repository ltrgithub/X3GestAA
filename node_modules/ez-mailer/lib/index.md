## Writer mailer device

`var ezm = require("ez-mailer")`  

* `writer = ezm.writer(options)`  
  creates a mailer device to which you can write mails. 
* `writer = ezm.formatter(options)`  
  returns a mustache mapper that applies a template to a mail message on all first level string properties
