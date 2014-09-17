"use strict";

exports.parser = function(_type) {
 
  return function(_ , _item) {
    _item.data = (parseFloat(_item.buffer)/1000);
    return _item;
  }
}
