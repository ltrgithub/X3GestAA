# Session configuration entity  
This entity is not persistent.  
Information managed by it are attached to the http session.  

## Properties
* **runtimeLog** - *boolean*: Activates runtime logging for this Syracuse session  
* **logFlag** - *integer*: Bit mask to enable various logging options  
* **directory** - *string*: Directory used to store logging information  
## Relations
* **endPoint** - Endpoint: Endpoint for which the log is activated (all endpoints if none is specified)
## Services
* **submit**: Apply changes
