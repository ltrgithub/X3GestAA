-------------
## schedule function 

``` javascript
notificationTime.schedule(_, event, key, executionTime, parameters, mode);
```

Schedule one instance of the given event.


* The `event` parameter represents the corresponding event (e. g. sending a certain email with a content template)
* The `key` parameter represents a key value for this instance. Scheduling a new event with the same key will replace 
  the previously scheduled event
* The `executionTime` parameter contains the execution time. This can be a date string in ISO format or the number of milliseconds since 1 January 1970.
* The `parameters` parameter contains a JSON structure which serves for placeholders within the event text
* The `mode` parameter denotes how the event should be scheduled: 0 without database change, 1 with database change, 2 schedule also on other servers in cluster.
 
-------------
## scheduleAll function 

``` javascript
notificationTime.scheduleAll(_, event, data, mode);
```

Replace all scheduled instances for this event

* The `event` parameter represents the corresponding event (e. g. sending a certain email with a content template)
* The `data` parameter contains an array of triples `[key, executionTime, parameters]`, where `key`, `executionTime`,
  `parameters` have the same meaning as in the `schedule` function. Elements in this list with same key will replace
  scheduled events. Scheduled events whose key does not appear any more in this list will be deleted. If the parameter
  is empty (really empty, not just empty array), the scheduler will just be initialized.
* The `mode` parameter denotes how the event should be scheduled: 0 without database change, 1 with database change, 2 schedule also on other servers in cluster.
