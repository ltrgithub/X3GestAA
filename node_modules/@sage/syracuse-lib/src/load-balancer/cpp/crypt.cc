#include <node.h>
#include <node_buffer.h>
#include <node_version.h>
#include <v8.h>
#include <stdio.h>
#include <cstdlib>
#include <ctime>
#include <string.h>

using namespace v8;
using namespace node;

// Native module for passphrase encryption.
// Uses CryptProtectData under Windows and AES256 under Linux after making a key out of operating system ID (D-Bus machine ID) and user UID.


#if NODE_MAJOR_VERSION >= 4
#define V4 V4
#elif NODE_MAJOR_VERSION > 0 || (NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION >= 12)
#define V12
#elif NODE_MAJOR_VERSION > 0 || (NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION >= 11)
#define V11
#endif

#if defined(V12) || defined(V4)
#define HANDLE_SCOPE HandleScope scope(Isolate::GetCurrent())
#define UNDEFINED() Undefined(Isolate::GetCurrent())
#define STRING_NEW(bytes) String::NewFromUtf8(Isolate::GetCurrent(), bytes)
#define STRING_NEW2(bytes, len) String::NewFromUtf8(Isolate::GetCurrent(), bytes, String::kNormalString, len)
#define STRING_NEW_SYMBOL(bytes) String::NewFromUtf8(Isolate::GetCurrent(), bytes)
#define BOOLEAN_NEW(val) Boolean::New(Isolate::GetCurrent(), val)
#if defined(V4)
#define BUFFER_NEW1(a) Buffer::New(Isolate::GetCurrent(), a).ToLocalChecked()
#define BUFFER_NEW2(a, b) Buffer::Copy(Isolate::GetCurrent(), a, b).ToLocalChecked()
#else
#define BUFFER_NEW1(a) Buffer::New(Isolate::GetCurrent(), a)
#define BUFFER_NEW2(a, b) Buffer::New(Isolate::GetCurrent(), a, b)
#endif
#define FUNCTION_TEMPLATE_NEW(val) FunctionTemplate::New(Isolate::GetCurrent(), val)
#define SCRIPT_NEW(val) Script::Compile(val)
#define THROW_EXCEPTION(ex) Isolate::GetCurrent()->ThrowException(ex)
#define CURRENT_CONTEXT() Isolate::GetCurrent()->GetCurrentContext()
#define FORCE_SET ForceSet
#else
#define HANDLE_SCOPE HandleScope scope
#define UNDEFINED()	Undefined()
#define STRING_NEW(bytes) String::New(bytes)
#define STRING_NEW2(bytes, len) String::New(bytes, len)
#define STRING_NEW_SYMBOL(bytes) String::NewSymbol(bytes)
#define BOOLEAN_NEW(val) Boolean::New(val)
#define BUFFER_NEW1(a) Buffer::New(a)
#define BUFFER_NEW2(a, b) Buffer::New(a, b)
#define FUNCTION_TEMPLATE_NEW(val) FunctionTemplate::New(val)
#define SCRIPT_NEW(val) Script::New(val)
#define THROW_EXCEPTION(ex) ThrowException(ex)
#define CURRENT_CONTEXT() Context::GetCurrent()
#define FORCE_SET Set
#endif

#if defined(V12) || defined(V11) || defined(V4)
#define BUFFER_TYPE Local<Value>
#define BUFFER_TO_HANDLE(ARG) (ARG)
#define RETURN_TYPE	void
#define RETURN(v) { args.GetReturnValue().Set(v); return; }
#define ARGUMENTS v8::FunctionCallbackInfo<Value>
#define LOCAL_VALUE(h)	(h)
#define FUNCTION_TO_PERSIST(pfn, fn)	pfn.Reset(Isolate::GetCurrent(), fn)
#define FUNCTION_TO_HANDLE(pfn)		Local<Function>::New(Isolate::GetCurrent(), pfn)
#else
#define BUFFER_TYPE Buffer*
#define BUFFER_TO_HANDLE(ARG) Local<Value>::New((ARG)->handle_)
#define RETURN_TYPE	Handle<Value>
#define RETURN(v) return scope.Close(v)
#define ARGUMENTS Arguments
#define LOCAL_VALUE(h)	Local<Value>(*h)
#define FUNCTION_TO_PERSIST(pfn, fn)	pfn = Persistent<Function>::New(fn)
#define FUNCTION_TO_HANDLE(pfn)		pfn
#endif

#if NODE_MAJOR_VERSION > 0 || (NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION > 11) || (NODE_MAJOR_VERSION == 0 && NODE_MINOR_VERSION == 11 && NODE_PATCH_VERSION >= 12)
#define SCOPE(scope)	HandleScope scope(Isolate::GetCurrent())
#else
#define SCOPE(scope)	HandleScope scope
#endif




#ifdef WIN32
#pragma comment(lib, "crypt32.lib")
#include <windows.h>
#include <Wincrypt.h>

bool cryptWindows(char* input, Local<Value>* result)
{
	DATA_BLOB data_in;
	DATA_BLOB data_out;
	data_in.pbData = (BYTE *) input;    
	data_in.cbData = (DWORD) strlen(input);
	if (CryptProtectData(&data_in, NULL, NULL, NULL, NULL, CRYPTPROTECT_UI_FORBIDDEN, &data_out))
	{
		BUFFER_TYPE resultb = BUFFER_NEW2((char*) data_out.pbData, (size_t) data_out.cbData);
		LocalFree(data_out.pbData);
		*result = BUFFER_TO_HANDLE(resultb);
		return true;
	}
	else
	{
		LocalFree(data_out.pbData);
		char errortext[30];
		sprintf(errortext, "Encryption error %d", GetLastError());
		THROW_EXCEPTION(Exception::Error(STRING_NEW(errortext)));
		return false;
	}
}

bool decryptWindows(Local<Object> input, Local<Value>* result)
{
	DATA_BLOB data_in;
	DATA_BLOB data_out;
	data_in.pbData = (BYTE*) Buffer::Data(input);    
	data_in.cbData = (DWORD) Buffer::Length(input);
	if (CryptUnprotectData(&data_in, NULL, NULL, NULL, NULL, CRYPTPROTECT_UI_FORBIDDEN, &data_out))
	{
		*result = STRING_NEW2((char*) data_out.pbData, data_out.cbData);
		LocalFree(data_out.pbData);
		return true;
	}
	else
	{
		LocalFree(data_out.pbData);
		char errortext[30];
		sprintf(errortext, "Decryption error %d", GetLastError());
		THROW_EXCEPTION(Exception::Error(STRING_NEW(errortext)));
		return false;
	}
}
#else

#include <unistd.h>
#include <sys/types.h>

// JavaScript function for AES
static Persistent<Function> encryptFunction;
static bool encryptFunctionDefined = false;

// JavaScript code for AES encryption/decryption
char script[] = "(function (require) { "
	"var crypto = require('crypto');"
	"return function(key, code, enc, iv) {"
	"var c = (enc ? crypto.createCipheriv('aes256', key, iv) : crypto.createDecipheriv('aes256', key, iv));"
	"var r =  new Buffer(c.update(code, null, 'binary')+c.final('binary'), 'binary');"
	"return r;"
	"}"
	"})";

// read operating system ID
#ifdef __APPLE__
#	define Boolean Boolean_osx
#	define Handle Handle_osx
#	include <IOKit/IOKitLib.h>

// see http://stackoverflow.com/questions/933460/unique-hardware-id-in-mac-os-x
int getId(char * buf, int bufSize) {
	// 71B85C44-050B-5F7F-996D-AD1F6780B1D1
    io_registry_entry_t ioRegistryRoot = IORegistryEntryFromPath(kIOMasterPortDefault, "IOService:/");
    CFStringRef uuidCf = (CFStringRef) IORegistryEntryCreateCFProperty(ioRegistryRoot, CFSTR(kIOPlatformUUIDKey), kCFAllocatorDefault, 0);
    IOObjectRelease(ioRegistryRoot);
    int len = CFStringGetLength(uuidCf);
    if (len != 36) {
    	printf("bad uuid len: got %d\n", len);
    	return 0;
    }
	char b[37];
    int ok = CFStringGetCString(uuidCf, b, 37, kCFStringEncodingMacRoman);
    if (!ok) {
    	printf("failed to convert to string\n");
    	return 0;    	
    }
    CFRelease(uuidCf);

    //printf("b=%s\n", b);
    for (int i = 0; i < bufSize; i++) {
    	int j = 2 * (i % 16);
    	if (j >= 8) j++;
    	if (j >= 13) j++;
    	if (j >= 18) j++;
    	if (j >= 23) j++;
    	int v;
    	sscanf(&b[j], "%2x", &v);
    	buf[i] = v;
    }
    //for (i = 0; i < bufSize; i++) printf("after  %d: %02x\n", i, buf[i]);
    return bufSize;    
}
#undef Boolean
#undef Handle

#else // __APPLE__

int getId(char* id, int size) 
{
	FILE* f;
	int result;
	f = fopen("/etc/machine-id", "r"); /* with systemd */
	if (!f) 
	{
		f = fopen("/var/lib/dbus/machine-id", "r");
		if (!f)	
	    	return 0;
	}
	result = fread(id, 1, size, f);
	fclose(f);
	return result;
}

#endif // __APPLE__

inline static void demangle(unsigned char* buffer, size_t length)
{
	if (length > 0)
	{
		for (size_t i = 0; i <= 3*length; i++)
			buffer[i % length] ^= (((43*i) % 256) ^ buffer[(i+1) % length] ^ (73*buffer[(i+3) % length])%256);
	}
}

inline static void mangle(unsigned char* buffer, size_t length)
{
	if (length > 0)
	{
		for (int i = (int) (3*length); i >= 0; i--)
			buffer[i % length] ^= (((43*i) % 256) ^ buffer[(i+1) % length] ^ (73*buffer[(i+3) % length])%256);
	}
}



// calls the JavaScript function and returns true if there is no exception. The return value will be placed within result. If the JavaScript function
// throws an exception, the result is false; in this case call scope.Close() immediately and exit the function.
static bool callSafe(Handle<Function> fkt, unsigned argc, Local<Value> argv[], Local<Value> * result) {
	TryCatch trycatch;
	*result = fkt->Call(CURRENT_CONTEXT()->Global(), argc, argv);
	if (trycatch.HasCaught())
	{
		trycatch.ReThrow();
		return false;
	}
	return true;
}

/* executes the Javascript code in the first argument which must be a function with 1 parameter, then executes the function and returns the result */
static bool script_exec(const char* script, Local<Value>* result, Local<Value> arg0) 
{
	Local<Value> res = SCRIPT_NEW(STRING_NEW(script))->Run();
	if (res->IsNull() || res->IsUndefined())
		return false;
	const unsigned argc = 1;
	Local<Value> argv[argc] = {arg0};
	Local<Function> fkt = Local<Function>::Cast(res);
	return callSafe(fkt, argc, argv, result);
}


static bool makeEncryptFunction(Local<Value> req) 
{
	if (!encryptFunctionDefined)
	{
		Local<Value> result0;
		if (!script_exec(script, &result0, req))
			return false;
  		if (result0->IsNull())
			return false;
		FUNCTION_TO_PERSIST(encryptFunction, Local<Function>::Cast(result0));
		encryptFunctionDefined = true;
	}
	return true;
}

// safe call to encrypt function: will return false when there is an error
static bool callEncryptFunction(Local<Value> input, Local<Value>* output, Local<Value> key, Local<Value> iv, bool encrypt)
{
	const unsigned argc = 4;
	Local<Value> argv[argc] = { key, input, BOOLEAN_NEW(encrypt)->ToBoolean(), iv };
	Handle<Function> encryptFunctionLocal = FUNCTION_TO_HANDLE(encryptFunction);
	return callSafe(encryptFunctionLocal, argc, argv, output);
}

#define KEY_LENGTH 32
#define IV_LENGTH 16
// use D-Bus machine ID and user ID to create a 32 byte key
bool makeKey(Local<Value>* result, char* iv)
{
  char key[KEY_LENGTH];
  int length;
  int i;
  // initialize key;
  for (i=0; i<KEY_LENGTH; i++)
  {
	  key[i] = i;
  }
  // set machine-id
  length = getId(key, KEY_LENGTH);
  if (!length)
  {
    // ID not found
	THROW_EXCEPTION(Exception::Error(STRING_NEW("No ID")));	
    return false;
  }
  // some transformation ...
  demangle((unsigned char*) key, KEY_LENGTH);
  // set user ID
  sprintf(key, "%lx", (long unsigned) getuid());
  for (i=0; i<IV_LENGTH; i++)
  {
	  key[i] ^= iv[i];
  }
  // some transformation ...
  demangle((unsigned char*) key, KEY_LENGTH);
  BUFFER_TYPE b = BUFFER_NEW2(key, KEY_LENGTH);
  *result = BUFFER_TO_HANDLE(b); 
  return true;
}


bool cryptLinux(char* input, Local<Value>* result, Local<Value> req)
{
	char ch_iv[IV_LENGTH];
	srand((unsigned int) time(NULL));
	for (int i=0; i<IV_LENGTH; i++) {
		ch_iv[i] = rand() % 256;
	}
	BUFFER_TYPE iv = BUFFER_NEW2(ch_iv, IV_LENGTH);
	Local<Value> iv_h = BUFFER_TO_HANDLE(iv);
  
	// mangling only works when length is at least 4
	size_t inputlength1 = strlen(input)+1;
	size_t inputlength = inputlength1 < 4 ? 4 : inputlength1;
	Local<Value> key_h;
	if (!makeKey(&key_h, ch_iv))
		return false;
	BUFFER_TYPE toEncrypt = BUFFER_NEW1(inputlength);
	char* data = Buffer::Data(toEncrypt); // changes to 'data' will change the bytes in the buffer
	memcpy(data, input, inputlength);
	Local<Value> toEncrypt_h = BUFFER_TO_HANDLE(toEncrypt);
	// fill missing data with null bytes (will be stripped in the end of decryption)
	for (size_t i=inputlength1; i<4; i++)
		data[i] = 0;
	mangle((unsigned char*) (data), inputlength);
	if (!makeEncryptFunction(req))
		return false;
	Local<Value> encrypted;
	if (!callEncryptFunction(toEncrypt_h, &encrypted, key_h, iv_h, true))
		return false;
	size_t encryptedLength = Buffer::Length(encrypted->ToObject());
	// add iv to encrypted data
	BUFFER_TYPE encryptedIv = BUFFER_NEW1(encryptedLength+IV_LENGTH);
	char* encryptedIvData = Buffer::Data(encryptedIv); // changes in encryptedIvData will change buffer contents
	memcpy(encryptedIvData, ch_iv, IV_LENGTH);
	memcpy(encryptedIvData+IV_LENGTH, Buffer::Data(encrypted->ToObject()), encryptedLength);
	*result = BUFFER_TO_HANDLE(encryptedIv);
	return true;
}


bool decryptLinux(Local<Object> input, Local<Value>* result, Local<Value> req)
{
	char* input_data = Buffer::Data(input);
	size_t input_length = Buffer::Length(input);
	if (input_length < IV_LENGTH)
	{
		THROW_EXCEPTION(STRING_NEW("Cannot decrypt data"));
		return false;
	}
	Local<Value> key;
	if (!makeKey(&key, input_data))
		return false;
	if (!makeEncryptFunction(req))
		return false;
	Local<Value> decrypted;
	// find out IV and strip IV from encrypted data
	BUFFER_TYPE iv = BUFFER_NEW2(input_data, IV_LENGTH);
	Local<Value> iv_h = BUFFER_TO_HANDLE(iv);
	BUFFER_TYPE input1 = BUFFER_NEW2(input_data+IV_LENGTH, input_length-IV_LENGTH);
	Local<Value> input1_h = BUFFER_TO_HANDLE(input1);
	if (!callEncryptFunction(input1_h, &decrypted, key, iv_h, false))
		return false;
	Local<Object> decrypted1 = decrypted->ToObject();
	char* content = Buffer::Data(decrypted1);
	int length = (int) Buffer::Length(decrypted1);
	demangle((unsigned char*) content, length);
	if (content[length-1] != 0) // test whether string ends with null byte
	{
		THROW_EXCEPTION(STRING_NEW("Wrong result after decryption"));
		return false;
	}
	// this will strip all trailing null bytes
	*result = STRING_NEW(content);
	return true;
}
#endif


/* encrypt passphrases
 */
 
static RETURN_TYPE encrypt(const ARGUMENTS &args)
{
	SCOPE(scope);
	if (args.Length() < 2) 
	{
		THROW_EXCEPTION(Exception::TypeError(STRING_NEW("Wrong number of arguments")));
		RETURN(UNDEFINED());
	}
	if (args[0]->IsUndefined() || args[0]->IsNull()) 
	{
	    THROW_EXCEPTION(Exception::TypeError(STRING_NEW("Nothing to encrypt")));
		RETURN(UNDEFINED());
	}
	if (!args[1]->IsObject())
	{
	    THROW_EXCEPTION(Exception::TypeError(STRING_NEW("Second argument no object")));
		RETURN(UNDEFINED());
	}
	String::Utf8Value text(args[0]->ToString());
    Local<Value> result;
#ifdef WIN32
	if (!cryptWindows(*text, &result))
        RETURN(UNDEFINED());
#else
	if (!cryptLinux(*text, &result, args[1]))
        RETURN(UNDEFINED());
#endif
	RETURN(result);
}

/* decrypt passphrases
 */
static RETURN_TYPE decrypt(const ARGUMENTS &args)
{
	SCOPE(scope);
	if (args.Length() < 2) 
	{
		THROW_EXCEPTION(Exception::TypeError(STRING_NEW("Wrong number of arguments")));
		RETURN(UNDEFINED());
	}
	if (!Buffer::HasInstance(args[0])) 
	{
		THROW_EXCEPTION(Exception::TypeError(STRING_NEW("First argument is no buffer")));
		RETURN(UNDEFINED());
	}
	if (!args[1]->IsObject())
	{
	    THROW_EXCEPTION(Exception::TypeError(STRING_NEW("Second argument no object")));
		RETURN(UNDEFINED());
	}
    Local<Value> result;
#ifdef WIN32
	if (!decryptWindows(args[0]->ToObject(), &result))
		RETURN(UNDEFINED());
#else
	if (!decryptLinux(args[0]->ToObject(), &result, args[1]))
		RETURN(UNDEFINED());
#endif
	RETURN(result);
}

void init(Handle<Object> target)
{
	target->FORCE_SET(STRING_NEW_SYMBOL("encrypt"), FUNCTION_TEMPLATE_NEW(encrypt)->GetFunction(), static_cast<PropertyAttribute>(ReadOnly|DontDelete));
	target->FORCE_SET(STRING_NEW_SYMBOL("decrypt"), FUNCTION_TEMPLATE_NEW(decrypt)->GetFunction(), static_cast<PropertyAttribute>(ReadOnly|DontDelete));
}

NODE_MODULE(crypt, init)

