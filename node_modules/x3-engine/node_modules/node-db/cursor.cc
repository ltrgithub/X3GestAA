// Copyright 2011 Bruno Jouhier <bjouhier@gmail.com>
#include "./cursor.h"

v8::Persistent<v8::FunctionTemplate> node_db::Cursor::constructorTemplate;

void node_db::Cursor::Init(v8::Handle<v8::Object> target) {
    v8::HandleScope scope;

    v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(New);

    constructorTemplate = v8::Persistent<v8::FunctionTemplate>::New(t);
    constructorTemplate->InstanceTemplate()->SetInternalFieldCount(1);

    NODE_ADD_PROTOTYPE_METHOD(constructorTemplate, "next", Next);

    target->Set(v8::String::NewSymbol("Cursor"), constructorTemplate->GetFunction());
}

node_db::Cursor::Cursor(): node::ObjectWrap(), query(NULL), result(NULL), rowIndex(0) {}

node_db::Cursor::~Cursor() {
    if (this->result != NULL) 
    	delete this->result;
    if (this->query != NULL) 
    	this->query->Unref();
}

void node_db::Cursor::setQuery(Query* q) {
	if (query != NULL)
		query->Unref();
	query = q;
	if (query != NULL)
		query->Ref();
}

void node_db::Cursor::setResult(Result* r) {
	result = r;	
}

v8::Handle<v8::Value> node_db::Cursor::New(const v8::Arguments& args) {
    v8::HandleScope scope;
	
    node_db::Cursor* cursor = new node_db::Cursor();
    if (cursor == NULL) {
        THROW_EXCEPTION("Can't create cursor object")
    }

    cursor->Wrap(args.This());
    return scope.Close(args.This());
}

v8::Handle<v8::Value> node_db::Cursor::Next(const v8::Arguments& args) {
    v8::HandleScope scope;

    node_db::Cursor *cursor = node::ObjectWrap::Unwrap<node_db::Cursor>(args.This());
    assert(cursor);
    assert(cursor->query);
    assert(cursor->result);

	if (args.Length() == 0)
        THROW_EXCEPTION("Callback expected as first argument but none found");
    execute_request_t *request = new execute_request_t();
    if (request == NULL) {
        THROW_EXCEPTION("Could not create EIO request")
    }

    request->context = v8::Persistent<v8::Object>::New(args.This());
    request->cursor = cursor;
    request->query = cursor->query;
    request->result = cursor->result;
    request->error = NULL;
    request->cbNext = node::cb_persist(args[0]);

    cursor->Ref();
    
    eio_custom(eioNext, EIO_PRI_DEFAULT, eioNextFinished, request);
    ev_ref(EV_DEFAULT_UC);

    return scope.Close(v8::Undefined());
}

void node_db::Cursor::eioNext(eio_req* eioRequest) {
    execute_request_t *request = static_cast<execute_request_t *>(eioRequest->data);
    assert(request);
    assert(request->cursor);
    assert(request->query);
    assert(request->result);

    try {
    	if(!request->result->isEmpty() && request->result->hasNext()) {
            request->row = new Query::row_t();
            Query::row_t* row = request->row;
            if (request->row == NULL) {
                throw node_db::Exception("Could not create buffer for row");
            }
            request->buffered = request->result->isBuffered();
            request->columnCount = request->result->columnCount();

            unsigned long* columnLengths = request->result->columnLengths();
            char** currentRow = request->result->next();

            row->columnLengths = new unsigned long[request->columnCount];
            if (row->columnLengths == NULL) {
                throw node_db::Exception("Could not create buffer for column lengths");
            }

            if (request->buffered) {
                row->columns = currentRow;

                for (uint16_t i = 0; i < request->columnCount; i++) {
                    row->columnLengths[i] = columnLengths[i];
                }
            } else {
                row->columns = new char*[request->columnCount];
                if (row->columns == NULL) {
                    throw node_db::Exception("Could not create buffer for columns");
                }

                for (uint16_t i = 0; i < request->columnCount; i++) {
                    row->columnLengths[i] = columnLengths[i];
                    if (currentRow[i] != NULL) {
                        row->columns[i] = new char[row->columnLengths[i]];
                        if (row->columns[i] == NULL) {
                            throw node_db::Exception("Could not create buffer for column");
                        }
                        memcpy(row->columns[i], currentRow[i], row->columnLengths[i]);
                    } else {
                        row->columns[i] = NULL;
                    }
                }
            }
    	} else {
    		request->row = NULL;
    	}
    } catch(const node_db::Exception& exception) {
        Cursor::freeRequest(request, false);
        request->error = exception.what();
    }
}

int node_db::Cursor::eioNextFinished(eio_req* eioRequest) {
    v8::HandleScope scope;

    execute_request_t *request = static_cast<execute_request_t *>(eioRequest->data);
    assert(request);
    if (request->error == NULL) {
        v8::Local<v8::Value> argv[3];
        argv[0] = v8::Local<v8::Value>::New(v8::Null());
        int argc = 2;

    	if(request->result != NULL && request->row != NULL) {
	        bool isEmpty = request->result->isEmpty();
	        if (!isEmpty) {
	            argc = 3;
		
	            v8::Local<v8::Object> row = request->query->row(request->result, request->row);
	            v8::Local<v8::Value> eachArgv[3];
	
	            eachArgv[0] = row;
	            eachArgv[1] = v8::Number::New(request->result->index());
	            eachArgv[2] = v8::Local<v8::Value>::New(request->result->hasNext() ? v8::True() : v8::False());
	
	            request->query->Emit("each", 3, eachArgv);
		
	            v8::Local<v8::Array> columns = v8::Array::New(request->columnCount);
	            for (uint16_t j = 0; j < request->columnCount; j++) {
	                node_db::Result::Column *currentColumn = request->result->column(j);
	
	                v8::Local<v8::Object> column = v8::Object::New();
	                column->Set(v8::String::New("name"), v8::String::New(currentColumn->getName().c_str()));
	                column->Set(v8::String::New("type"), NODE_CONSTANT(currentColumn->getType()));
	
	                columns->Set(j, column);
	            }
		
	            argv[1] = row;
		        argv[2] = columns;
	        } else {
	            v8::Local<v8::Object> result = v8::Object::New();
	            result->Set(v8::String::New("id"), v8::Number::New(request->result->insertId()));
	            result->Set(v8::String::New("affected"), v8::Number::New(request->result->affectedCount()));
	            result->Set(v8::String::New("warning"), v8::Number::New(request->result->warningCount()));
	            argv[1] = result;
	        }

	        request->query->Emit("success", !isEmpty ? 2 : 1, &argv[1]);

		}
		else {
			argv[1] = v8::Local<v8::Value>::New(v8::Null());
		}	
		//
        if (request->cbNext != NULL && !request->cbNext->IsEmpty()) {
            v8::TryCatch tryCatch;
            (*(request->cbNext))->Call(request->context, argc, argv);
            if (tryCatch.HasCaught()) {
                node::FatalException(tryCatch);
            }
        }
    } else {
        v8::Local<v8::Value> argv[1];
        argv[0] = v8::String::New(request->error != NULL ? request->error : "(unknown error)");

        request->query->Emit("error", 1, argv);

        if (request->cbNext != NULL && !request->cbNext->IsEmpty()) {
            v8::TryCatch tryCatch;
            (*(request->cbNext))->Call(request->context, 1, argv);
            if (tryCatch.HasCaught()) {
                node::FatalException(tryCatch);
            }
        }
    }
    
    ev_unref(EV_DEFAULT_UC);
    request->cursor->Unref();

    Cursor::freeRequest(request);

    return 0;
}

void node_db::Cursor::freeRequest(execute_request_t* request, bool freeAll) {
    if (request->row != NULL) {
        if (!request->buffered) {
            for (uint16_t i = 0; i < request->columnCount; i++) {
                if (request->row->columns[i] != NULL) {
                    delete request->row->columns[i];
                }
            }
            delete [] request->row->columns;
        }
        delete [] request->row->columnLengths;

        delete request->row;
    }

	if (freeAll) {
		request->context.Dispose();
		node::cb_destroy(request->cbNext);
	}
		
	delete request;
}


