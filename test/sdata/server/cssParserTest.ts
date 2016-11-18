"use strict";

var fs = require('fs');
var sys = require("util");

var config = require('config'); // must be first syracuse require
var cssParser = require('../../../src/sdata/render/cssParser');

var tracer; // = console.log;

function dump(o) {
	tracer && tracer("" + sys.inspect(o, true, null));
}

import { assert } from 'chai';
Object.keys(assert).forEach(key => {
	if (key !== 'isNaN') global[key] = assert[key];
});

describe(module.id, () => {

	it('css without comments', function() {
		var css = cssParser.parse('' +
			'\nsection {' +
			'\n	margin: 5;' +
			'\n	border: 2 solid gray;' +
			'\n	border-radius: 3;' +
			'\n	padding: 5;' +
			'\n}' +
			'\n' +
			'\nsection-title {' +
			'\n	font-family: "Helvetica-Bold";' +
			'\n	font-size: 12;' +
			'\n	color: #69923A;' +
			'\n}' +
			'\n');
		var expected = {
			section: {
				margin: {
					right: 5,
					left: 5,
					bottom: 5,
					top: 5
				},
				border: {
					right: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					left: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					bottom: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					radius: 3,
					top: {
						style: 'solid',
						color: 'gray',
						width: 2
					}
				},
				padding: {
					right: 5,
					left: 5,
					bottom: 5,
					top: 5
				}
			},
			'section-title': {
				font: {
					family: 'Helvetica-Bold',
					size: 12
				},
				color: '#69923A'
			}
		};
		deepEqual(css, expected, "css objects are equal");
	});

	it('css with comments', function() {
		var css = cssParser.parse('' +
			'\n	/* a comment outside a css block */' +
			'\n	section {' +
			'\n		margin: 5;' +
			'\n		border: 2 solid gray;' +
			'\n		border-radius: 3;' +
			'\n		padding: 5;' +
			'\n	}' +
			'\n	' +
			'\n	/* a multi line ' +
			'\n	comment outside ' +
			'\n	a css block ' +
			'\n	*/' +
			'\n	section-title {' +
			'\n	/* a comment inside a css block */' +
			'\n		font-family: "Helvetica-Bold";' +
			'\n		font-size: 12;/* a comment on a css line */' +
			'\n		/* a multi line ' +
			'\n		comment inside ' +
			'\n		a css block ' +
			'\n		*/' +
			'\n		color: #69923A;' +
			'\n	}' +
			'\n	');

		var expected = {
			section: {
				margin: {
					right: 5,
					left: 5,
					bottom: 5,
					top: 5
				},
				border: {
					right: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					left: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					bottom: {
						style: 'solid',
						color: 'gray',
						width: 2
					},
					radius: 3,
					top: {
						style: 'solid',
						color: 'gray',
						width: 2
					}
				},
				padding: {
					right: 5,
					left: 5,
					bottom: 5,
					top: 5
				}
			},
			'section-title': {
				font: {
					family: 'Helvetica-Bold',
					size: 12
				},
				color: '#69923A'
			}
		};
		// dump(css);
		deepEqual(css, expected, "css objects are equal");
	});
});