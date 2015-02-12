var page = require('webpage').create();
var system = require('system');

if (system.args.length < 2){
	console.log('Usage: screenshot.js <some URL>');
	phantom.exit();
}

var url = system.args[1];

page.open(url, function(status) {
  console.log("Status: " + status);
  if (status === "success") {
    page.render('example.png');
  }
  phantom.exit();
});