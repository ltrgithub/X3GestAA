
#ifndef _connection_h_
#define _connection_h_

#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#ifndef WIN32
  #include <unistd.h>
#endif
#include <occi.h>
#include <oro.h>
#include "utils.h"
#include "executeBaton.h"

using namespace node;
using namespace v8;

#include "uni.h"

class Connection : public ObjectWrap {
  friend class Reader;
  friend class ReaderBaton;
  friend class Statement;
  friend class StatementBaton;
public:
  static void Init(Handle<Object> target);
  static uni::CallbackType New(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType Execute(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType ExecuteSync(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType Prepare(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType CreateReader(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType Close(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType IsConnected(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType Commit(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType Rollback(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType SetAutoCommit(const uni::FunctionCallbackInfo& args);
  static uni::CallbackType SetPrefetchRowCount(const uni::FunctionCallbackInfo& args);
  static Persistent<FunctionTemplate> constructorTemplate;
  static void EIO_Execute(uv_work_t* req);
  static void EIO_AfterExecute(uv_work_t* req, int status);
  static void EIO_Commit(uv_work_t* req);
  static void EIO_AfterCommit(uv_work_t* req, int status);
  static void EIO_Rollback(uv_work_t* req);
  static void EIO_AfterRollback(uv_work_t* req, int status);
  void closeConnection();

  Connection();
  ~Connection();

  void setConnection(oracle::occi::Environment* environment, oracle::occi::Connection* connection);
  oracle::occi::Environment* getEnvironment() { return m_environment; }

protected:
  // shared with Statement
  static oracle::occi::Statement* CreateStatement(ExecuteBaton* baton);
  static void ExecuteStatement(ExecuteBaton* baton, oracle::occi::Statement* stmt);

  // shared with Reader
  oracle::occi::Connection* getConnection() { return m_connection; }
  bool getAutoCommit() { return m_autoCommit; }
  int getPrefetchRowCount() { return m_prefetchRowCount; }

  static int SetValuesOnStatement(oracle::occi::Statement* stmt, ExecuteBaton* baton);
  static void CreateColumnsFromResultSet(oracle::occi::ResultSet* rs, ExecuteBaton* baton, std::vector<column_t*> &columns);
  static row_t* CreateRowFromCurrentResultSetRow(oracle::occi::ResultSet* rs, ExecuteBaton* baton, std::vector<column_t*> &columns);
  static void handleResult(ExecuteBaton* baton, Handle<Value> (&argv)[2]);

private:
  static Local<Array> CreateV8ArrayFromRows(ExecuteBaton* baton, std::vector<column_t*> columns, std::vector<row_t*>* rows);
  static Local<Object> CreateV8ObjectFromRow(ExecuteBaton* baton, std::vector<column_t*> columns, row_t* currentRow);

  oracle::occi::Connection* m_connection;
  oracle::occi::Environment* m_environment;
  bool m_autoCommit;
  int m_prefetchRowCount;
};

#endif
