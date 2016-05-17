# Factory API
```javascript
var factory = require('syracuse-orm/lib/factory')
```
-------------
## Collections toArray function :
``` javascript
var array = anInstance.myList(_).toArray(_);
```
returns an array of elements or an array of snapshots if the parent is an snapshot
-------------
## Collections toUuidArray function :
``` javascript
var array = anInstance.myList(_).toUuidArray(_);
```
return an array of uuids (to avoid instanciation)
-------------
## Collections sort function :
``` javascript
anInstance.myList(_).sort(_, sortFunction);
```
return an array of uuids (to avoid instanciation)
-------------
## Collections refresh function :
``` javascript
anInstance.myList(_).refresh(_);
```
for computed relations, reloades the objects list. Does nothing for stored relations
-------------
## Collections deleteInstance function :
``` javascript
anInstance.myList(_).deleteInstance(_, instanceId);
```
removes the instance identified by instanceId from the collection
-------------
## Collections reset function :
``` javascript
anInstance.myList(_).reset(_);
```
Removes all elements from the collection
-------------
## Collections get function :
``` javascript
var elem = anInstance.myList(_).get(_, uuid);
```
-------------
## Collections add function :
``` javascript
var newElem = anInstance.collection(_).add(_);
```
Creates a new element and adds it to the collection
Returns the created new element
-------------
## Collections setUuid function :
``` javascript
aRef = anInstance.myList(_).setUuid(_, aRefUuid);
```
-------------
## Collections set function :
``` javascript
var aRef = anInstance.myList(_).set(_, aRef);
```
-------------
## Collections filter function :
``` javascript
var options = {
    jsonWhere: {
      title: "some title"
    }
}
var array = anInstance.myList(_).filter(_, options);
```
returns an array of collection elements filtered with an expression. Doesn't affect the collection itself
* options - object allowing to pass the filter as one of the properties
- jsonWhere : json like
- sdataWhere : string of sdata syntax
- where : parsed tree of sdata syntax
-------------
## Collections isEmpty function :
``` javascript
var empty = anInstance.myList(_).isEmpty();
```
-------------
## Collections getLength function :
``` javascript
var array = anInstance.myList(_).getLength();
```
-------------
## Stream property getProperties function :
``` javascript
var props = anInstance.content(_).getProperties(_);
```
Returns the stored element properties (file size, content type, ...)
-------------
## Stream property fileExists function :
``` javascript
var isThere = anInstance.content(_).fileExists(_);
```
-------------
## Stream property createWorkingCopy function :
``` javascript
anInstance.content(_).createWorkingCopy(_);
```
creates a new file for storage, to use for two phase update: when using a workingCopy, one must have persist changes of the file
before invoke "Save" on the object. So we should create a new file for update, then "Save" will persist object's pointer to the new file.
-------------
## Stream property createReadableStream function :
``` javascript
var stream = anInstance.content(_).createReadableStream(_);
var buf;
while(buf = stream.read(_))
  doSomething(buf);
```
------------
## Stream property createWritableStream function :
``` javascript
var stream = anInstance.content(_).createWritableStream(_);
while(buf = something)
  stream.write(_, buf, encoding);
stream.end(lastMessage, encoding, _);
```
NOTE: the "end" signature isn't standard as normaly doesn't take a callback. But Mongodb "GridFS" driver needs it
so make sure you passe a callback in las parameter of "end"
-------------
## Instance getEntity function :
``` javascript
var entity = anInstance.getEntity(_);
```
-------------
## Instance getPropAllLocales function :
``` javascript
var object = anInstance.getPropAllLocales(_, propName);
```
For localized properties, returns a map with all locales
-------------
## Factory $resolvePath function :
``` javascript
var value = instance.$resolvePath(_, "myRelation.secondRef.property");
```
Returns the value of the property scanning the path
-------------
## Factory $resolveTemplate function :
``` javascript
var value = instance.$resolveTemplate(_, "some string with {placeholders}");
```
Returns the value of the template replacing placeholders
-------------
## Factory $getSummary function :
``` javascript
var value = instance.$getSummary(_); 
```
Returns a resume of properties and relations

-------------
## Factory $canDelete function :
``` javascript
var canDelete = instance.$canDelete(_);
```
Performs verifications before delete
Returns false if cannot delete
-------------
## Factory deleteSelf function :
``` javascript
instance.deleteSelf(_);
```
Deletes the instance from the database
Performs verifications and cascade deletes
Returns false in case of error and instance.deleteError hints of the error
-------------
## Factory hasErrors function :
``` javascript
if(instance.hasErrors(_) doSomething();
```
Returns true if there are error diagnoses
-------------
## Factory getAllDiagnoses function :
``` javascript
var diags = [];
instance.getAllDiagnoses(_, diag, options);
```
Returns an flat array of diagnoses instead of a tree. Allows quick detection of diagnose messages
* diag - results array; diagnoses will be pushed into this array
* options = {
 }
-------------
## Factory createInstance function :
``` javascript
var newInstance = entity.factory.createInstance(_, initialData, dbConnection);
```
Creates a new instance of entity. If initial data is provided (existing object), it uses it to initialize the instance or creates a new object otherwise
dbConnection must be provided as an instance of the database driver
Returns the created new element
-------------
## Factory replyInstances function :
``` javascript
var factory = require("syracuse-orm/lib/factory");
...
factory.replyInstances(_, context);
```
Replies the request with an array of resources based on the context object
The context must provide the database abstraction, an entity and the filters
-------------
## Factory fetchInstance function :
``` javascript
var factory = require("syracuse-orm/lib/factory");
...
var instance = factory.fetchInstance(_, context);
```
Fetches an instance based on the context object
The context must provide the database abstraction, an entity and the instanceId
Returns the fetched element or null
-------------
## Factory replyInstance function :
``` javascript
var factory = require("syracuse-orm/lib/factory");
...
factory.replyInstance(_, context);
```
Replies the request with a resource based on the context object
The context must provide the database abstraction, an entity and the instanceId
