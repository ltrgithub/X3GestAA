/// Tests for checkLocale
/// the code conversion tests are here.
/// To check warnings for the file system, run
/// _node ../checkLocale._js -s fixtures
/// in the parent directory. The output should be identical to fixtures/checkLocaleOutput.txt

var checker = require('../checkLocale');

// Tests for convert function
var util = require('util');
var resource = {};
if (checker.convert('"a$#$Test"', resource) !== 'locale.format(module, "a")' || resource["a"] !== "Test") throw "Test1";

var resource = {};
if (checker.convert('"a$#$Test"+MSG_TEST ', resource) !== 'locale.format(module, "a", MSG_TEST) ' || resource["a"] !== "Test{0}") throw "Test2";

var resource = {};
if (checker.convert('"a$#$Test\' a"+(t || {}).test[5]+\' second \'+f(5)', resource) !== 'locale.format(module, "a", (t || {}).test[5], f(5))' || resource["a"] !== "Test' a{0} second {1}") throw "Test3";

var resource = {};
if (checker.convert('"a$#$Test\\\" \\\\"+MSG_TEST+\' second \'+f(5) ', resource) !== 'locale.format(module, "a", MSG_TEST, f(5)) ' || resource["a"] !== "Test\\\" \\\\{0} second {1}") throw "Test4";


var resource = {};
if (checker.convert('"a$#$"+f(abc[t] /* ))) */)+"Test"+"Test2"+g(77)+g(88)+"Test3"', resource) !== 'locale.format(module, "a", f(abc[t] /* ))) */), g(77), g(88))' && resource["a"] !== "{0}TestTest2{1}{2}Test3") throw "Test5";
var resource = {};
if (checker.convert('"a$#$"+g(function(a,b){return t;}); ("b$#$Test")', resource) !== 'locale.format(module, "a", g(function(a,b){return t;})); (locale.format(module, "b"))' && resource["a"] !== "{0}" && resource["b"] !== "Test") throw "Test6";
