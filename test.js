var s ='s1"e1...s2"e2';
var res = s.replace(/[\"\\\/\b\f\n\r\t]/g, "\\$&");
console.log("ESCJSON("+s+")="+res);
