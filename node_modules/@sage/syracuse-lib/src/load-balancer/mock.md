# Mock API  
Pass HTTP requests and responses through a pipe
## Mock class
constructor parameters: outputStream, inputStream, requestHandler and clientOptions
clientOptions is an object with the following optional attributes: 
timeout: after this time (in seconds), the request data will be deleted
request handler has already been wrapped to resume input stream
### Mock.ping()
Send a dummy request to the server with will be answered as fast as possible by the server.
The result is the time in milliseconds for the whole request
The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
This timeout does not have to do anything with the timeout in the Mock constructor.
### Mock.ping2()
Send a dummy request to the server with will be answered as fast as possible by the server.
The result comes from the child process: result of function which has been assigned to mock.pingfunction
The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
This timeout does not have to do anything with the timeout in the Mock constructor.
### Mock.detail()
Give detail information about all current requests on client and server side.
The result is for each request the path and whether there is an entry on client side and on server side and whether there is a response on client side
The optional timeout parameter gives a timeout after which the request will be aborted (with an error)
This timeout does not have to do anything with the timeout in the Mock constructor.
finds out whether the last multibyte character of this buffer is complete. If not, it returns the number of bytes of this 
incomplete character. The function assumes that the buffer contains a part of correctly encoded data.
the function assumes that the encoding is already normalized!
## MockStreamServer
This class emulates Streamline's HttpServer. The requests and responses are taken from the mock mechanism but are wrapped within
Streamline's HttpServerRequest, HttpServerResponse.
parameters: 
- disp: request dispatcher function
- outputStream: stream to write data to other mock (e. g. process.stdout)
- inputStream: stream to get data from other mock (e. g. process.stdin)
- clientOptions: options for mock (mainly: timeout)
- options: options which will be passed to Streamline's HttpServerRequest, HttpServerResponse
The listen method will start the server and resume the input stream
Parameters: the last parameter must be the callback function, the other parameters will be ignored (for IPV6)
## MemoryStream
this class is a writable stream which appends all data to a string (content field). It emulates the HttpResponse methods writeHead etc.
