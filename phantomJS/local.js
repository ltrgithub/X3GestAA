var page = require('webpage').create();
var system = require('system');
var address;
var loadInProgress = false;
//var insidePage = require('webpage').create();
//var insideAddress = "http://pc038043:8124/syracuse-main/html/main.html?url=%3Frepresentation%3Ds-uitest-gridArray.%24test";


page.onConsoleMessage = function(msg){
	console.log(msg);
};

page.onError = function(msg){
	console.log(msg);
}

page.onLoadStarted = function(){
	loadInProgress = true;
	console.log('load started');
}

page.onLoadFinished = function(){
	loadInProgress = false;
	console.log("load finished");
}



if (system.args.length < 2){
	console.log('Usage: local.js <some URL>');
	phantom.exit();
}

else {

	address = system.args[1];
	page.open(address, function(status){

		/*if (status === "success"){
			console.log("Connection was successfull");

			if (page.injectJs("jquery-1.7.min.js")){
				console.log("jquery file successfully injected !");
				page.evaluate(function(){
					console.log("page title before: "+ document.title);
					
					$("#username").val("JMK");
			    	$("#password").val("jmk");
			    	$("#go-basic").click();


			    	console.log("page title after: "+ document.title);

				});
			}
			else {
				console.log("failed to inject JS");
			}
		}
		phantom.exit();*/

		/*if (status === "success"){
			console.log("successful !");
			page.includeJs("./syracuse-ui/deps/jquery/jquery-1.7.min.js", function() {

				console.log("inside includeJS callback");

			    page.evaluate(function() {
			    	$("#username").val("JMK");
			    	$("#password").val("jmk");
			    	$("#go-basic").click();

			    	console.log("inside page.evaluate()");

			    	page.open("http://pc038043:8124/syracuse-main/html/main.html?url=%3Frepresentation%3Ds-uitest-gridArray.%24test", function(status){
						if (status==="success"){
							page.evaluate(function(){
								console.log(document.title);
							});
						}
						else {
							console.log('FAIL to load the address http://pc038043:8124/syracuse-main/html/main.html?url=%3Frepresentation%3Ds-uitest-gridArray.%24test');			
						}
						phantom.exit();
					});

			    });
			    phantom.exit()
			});
		}
		
		else {
			console.log('FAIL to load the address');
		}
		phantom.exit();*/


		if (status==="success"){
			console.log("success");
			page.evaluate(function(){

				console.log("document title before :" + document.title);

				// set username value
				document.getElementById("username").value = "JMK";
				
				// set password value
				document.getElementById("password").value = "jmk";
				
				// trigger authentication by clicking on the button
				document.getElementById("loginForm").submit();

				console.log("document title after :" + document.title);

				// trigger authentication by clicking on the button
				//document.getElementById("go-basic").click();
				
				/*page.open("http://pc038043:8124/syracuse-main/html/main.html?url=%3Frepresentation%3Ds-uitest-gridArray.%24test", function(status){
					if (status==="success"){
						page.evaluate(function(){
							console.log(document.title);
						});
					}
					else {
						console.log('FAIL to load the address http://pc038043:8124/syracuse-main/html/main.html?url=%3Frepresentation%3Ds-uitest-gridArray.%24test');			
					}
					phantom.exit();
				});*/

			});
		}
		else {
			console.log('FAIL to load the address');
		}

		phantom.exit();
	});

	
}
