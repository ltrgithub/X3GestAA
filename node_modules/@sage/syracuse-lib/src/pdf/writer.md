
# PDF Writer
```javascript
var pdfWriter = require('syracuse/src/pdf/writer')  
```

-------------
## create function :
``` javascript
var writer = pdfWriter.create(_, reader); 
```
Create PDF Writer for a PDF File.  

* The `reader` parameter must be a PDF Reader object.  

Returns the writer object  

-------------
## attach function :
``` javascript
var obj = writer.attach(_, filename, description, data); 
```
Create attachment on PDF file  

* The `filename` parameter represents the attachment name.    
* The `description` parameter represents the attachment description.  
* The `data` parameter represents the attachment file data to deflate.  

Returns the stream object attached reference id and the data original length  

-------------
## sign function :
``` javascript
var obj = writer.sign(_, certName); 
```
Sign PDF document with given cetificate.   

* The `certName` parameter represents the name of the public certificate that has been put in collaboration database.    

Returns the generated signature in hexadecimal format.  

-------------
## rollback function :
``` javascript
writer.rollback(_,complete); 
```
Revert modifications on PDF file.   

* The `complete` boolean parameter define if all modifications have to been revert.  

