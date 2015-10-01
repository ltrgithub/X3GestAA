"use strict";
QUnit.module(module.id);
var ez = require("ez-streams");
var jedi = require("ez-jedi");

function transform(_,source,prototype,chunkSize) {
	console.log(JSON.stringify(source));
	var rs = ez.devices.string.reader(source,chunkSize)
	.transform(jedi.parser(prototype))
	//.limit(5)
	.toArray(_);
	console.log(JSON.stringify(rs));

	return rs;
}

asyncTest("Object variable 1", 3, function(_) {
	var prototype = {
	 $type: "application/json",
	 $after: "\n",
   	 $properties: {
		string1: {
			$type: "application/x-string",
			$optional:false
			}
		}
	};

	var rs = transform(_,"line1\nline2\n",prototype,2);
	strictEqual(rs.length, 2, "rs.length");
	strictEqual(rs[0].string1, "line1", "line1");
	strictEqual(rs[1].string1, "line2", "line1");
	start();
});

asyncTest("Object variable 2", 3, function(_) {
	var prototype =  {
	    $name: "X3LOG",
	    $type: "application/json",
	    $after: "\n",
	    $properties: {
	        channel: {
	            $type: "application/x-string",
	            $before:"<",
	            $after:">"
	        },
	        script: {
	            $type: "application/x-string",
	            $before:"/",
	            $after:"$"
	        },
	        line: {
	            $type: "application/x-number",
	            $before:"(",
	            $after:")"
	        },
	        expression: {
	            $type: "application/x-string",
	            $after:","
	        },
	        tick: {
	            $type: "application/x-number",
	            $before:"tick:"
	        },
	    }
	};

	var source=
		"<channel 1>@X3.TRT/MENU$adx(9)                          Func EXISTE  , tick:0\n" +
		"<channel 2>@X3.TRT/MENU$adx(333)                         | Call EXISTE_ADX From  ORDSYS, tick:0\n"; 


	var rs = transform(_,source,prototype);
	strictEqual(rs.length, 2, "rs.length");
	strictEqual(rs[0].channel, "channel 1", "channel 1");
	strictEqual(rs[1].channel, "channel 2", "channel 2");

	start();
});


asyncTest("Object variable 3", 36, function(_) {
	var prototype = {
	    $name: "tc0001",
	    $after: "\r\n",
	    $type: "application/json",   
	    $properties: {
	        line: {
	            $type: "application/x-number",
	            $format: "000000",
	            $after: ";"
	        },
	        dateFR: {
	            $type: "application/x-date",
	            $format: "DD/MM/YYYY",
	            $delimited : {delimiter:"'",escape:"\\"},
	            $after: ";"
	        },
	        dateUSA: {
	            $type: "application/x-date",
	            $format: "YYYY/MM/DD",
	            $delimited : {delimiter:"'",escape:"\\"},
	            $after: ";"
	        },
	        texte: {
	            $type: "application/x-string",
	            $delimited : {delimiter:"'",escape:"\\"},
	            $after: ";"
	        },
	        montant: {
	            $type: "application/x-number",
	            $format: "###.##0,00"
	        }
	    }
	}

	function check(_,source,line,dateFR,dateUSA,texte,montant) {
		var rs = transform(_,source,prototype);
		//console.log(JSON.stringify(rs[0],null,'\t'));
		strictEqual(rs.length, 1, "rs.length");
		strictEqual(rs[0].line					, line 				, "rs[0].line");
		strictEqual(rs[0].dateFR.toString()		, dateFR.toString() , "rs[0].dateFR");
		strictEqual(rs[0].dateUSA.toString()	, dateUSA.toString() , "rs[0].dateUSA");
		strictEqual(rs[0].texte  				, texte				, "rs[0].texte");
		strictEqual(rs[0].montant				, montant 			, "rs[0].montant");

	}
	check(_,"1 ;'15/12/2013';'2013/12/15';'texte 1';1.002,03\r\n",
		1,
		new Date(2013,11,15),
		new Date(2013,11,15),
		"texte 1",
		1002.03 );

	check(_,"2 ;'1/12/2013' ;'2013/12/1';'texte with escaped characters \'2\' \\';2.003,04\r\n",
		2,
		new Date(2013,11,1),
		new Date(2013,11,1),
		"texte with escaped characters '2' \\",
		2003.04 );

	check(_,"3 ;'15/12/2013';'2013/12/15';'texte with 1 space after the last delimiter' ;3.004,05\r\n",
		3,
		new Date(2013,11,15),
		new Date(2013,11,15),
		"texte with 1 space after the last delimiter",
		3004.05 );
	
	check(_,"4 ;'15/1/2013' ;'2013/1/15';'texte with 1 space before the last delimiter ';04.005,06\r\n",
		4,
		new Date(2013,0,15),
		new Date(2013,0,15),
		"texte with 1 space before the last delimiter ",
		4005.06 );

	check(_,"5 ;'15/12/2013';'2013/12/15'; 'texte with 1 space before the first delimiter';50.123,05\r\n",
		5,
		new Date(2013,11,15),
		new Date(2013,11,15),
		"texte with 1 space before the first delimiter",
		50123.05 );

	check(_,"6 ;'15/12/2013';'2013/12/15';' texte with 1 space after the first delimiter';0.006,06\r\n",
		6,
		new Date(2013,11,15),
		new Date(2013,11,15),
		" texte with 1 space after the first delimiter",
		6.06 );

	start();
});


asyncTest("Object variable 4", 1, function(_) {
	var prototype = {
          $type: "application/json", 
          $properties: {
              label1:{
                  $type: "application/x-string",
                  $after: ";"
              },
              value1: {
                  $type: "application/x-string",
                  $after: "\r\n"
              },
          }
      };
      
	var source="label;line 1\r\n" ;

	var rs = transform(_,source,prototype);
	strictEqual(rs.length, 1, "rs.length");

    start();
});



