
# PDF Reader
```javascript
var pdfReader = require('syracuse/src/pdf/reader')  
```

-------------
## create function :
``` javascript
var reader = pdfReader.create(_, pdfFile); 
```
Create PDF Reader from a PDF File.  

* The `pdfFile` parameter must be the PDF file path.  

Returns the reader object  

-------------
## getTOC function :
``` javascript
var toc = reader.getTOC(_); 
```
Inspect PDF File and put xrefs table in memory.    

Returns xrefs entries information

-------------
## getObj function :
``` javascript
var obj = reader.getObj(_,id); 
```
Get pdf object properties.  

* The `id` parameter represents the object reference id.  

Returns object information (offset, generation number, letter, length, content, stream)  

-------------
## getObjStream function :
``` javascript
var obj = reader.getObj(_,id); 
```
Get pdf object stream in original format.  

* The `id` parameter represents the object reference id.  

Returns object stream inflated  

-------------
## getDocumentHash function :
``` javascript
var hash = reader.getDocumentHash(_, excludeOffsetBegin, excludeOffsetEnd); 
```
Get pdf document hash without signature content.  

* The `excludeOffsetBegin` parameter represents the begin offset of signature.  
* The `excludeOffsetEnd` parameter represents the end offset of signature.  

Returns document hash required to sign PDF document  

