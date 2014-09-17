"use strict";

exports.parser = function(_type) {
 
  return function(_ , _item) {
    var begin = _item.buffer.substring(0,_item.buffer.length-1);
    var end   = _item.buffer.substring(_item.buffer.length-1,_item.buffer.length);
    var sign=+1
    if(end == '{') {
      end = '0';
    }
    else if(end == '}') {
      sign = -1
      end = '0';
    }
    //'0'.charCodeAt(0) = 48
    //'J'.charCodeAt(0) = 74
    else if((end.charCodeAt(0)-74)>0) {
      sign = -1;
      end = String.fromCharCode(49+end.charCodeAt(0)-74);
    }
    //'A'.charCodeAt(0) = 65
    else if((end.charCodeAt(0)-65)>0) {
      end = String.fromCharCode(49+end.charCodeAt(0)-65);
    }
    _item.data = sign*parseFloat(begin+end);
    return _item;
  }
}
