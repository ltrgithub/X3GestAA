var page = require('webpage').create();
page.open('http://pc038043:8124', function(status) {
  console.log("Status: " + status);
  if(status === "success") {
    page.render('example.png');
  }
  phantom.exit();
});