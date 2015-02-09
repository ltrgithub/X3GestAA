console.log('Hello world!');
var system = require('system');

if (system.args.length === 1){
	console.log("Expected usage : hello.js <some url>");
	phantom.exit();
}

var page = require('webpage').create();

page.onConsoleMessage = function(msg){
	console.log(msg);
};

page.onLoadFinished = function(status) {
    console.log('Load Finished: ' + status);
};

page.onLoadStarted = function() {
    console.log('Load Started');
    page.evaluate(function () {
        console.log("PhantomJS sets window in onLoadStarted");
    });
};

page.open(system.args[1], function(status) {
	if (status !== "success"){
		console.log('FAIL to load the address');
	}
	else {
		var title = page.evaluate(function() {
			return document.title;
		});
		console.log(title);
	}
	phantom.exit();
});