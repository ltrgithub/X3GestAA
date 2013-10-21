"use strict";

QUnit.module(module.id);
var locale = require("syracuse-core/lib/locale");

test('format', 10, function() {
	strictEqual(locale.format('a{2}b{0}c{1}', 'x', 'y', 'z'), 'azbxcy', 'indexed args');
	strictEqual(locale.format('a{z}b{x}c{y}', {
		x: 1,
		y: 'y'
	}), 'aundefinedb1cy', 'keyed args');
	strictEqual(locale.format('{0?no|one|two|many} error{0?s||s}', 0), 'no errors', 'pluralization 0');
	strictEqual(locale.format('{0?no|one|two|many} error{0?s||s}', 1), 'one error', 'pluralization 1');
	strictEqual(locale.format('{0?no|one|two|many} error{0?s||s}', 2), 'two errors', 'pluralization 2');
	strictEqual(locale.format('{0?no|one|two|many} error{0?s||s}', 10), 'many errors', 'pluralization 10');
	strictEqual(locale.format('{{a{2}b{0}c}}{1}', 'x', 'y', 'z'), '{azbxc}y', 'double curly simple');
	strictEqual(locale.format('a{{{2}b{0}}}c{1}', 'x', 'y', 'z'), 'a{zbx}cy', 'double curly hard');
	strictEqual(locale.format('a{{{{{2}b{0}}}}}c{1}', 'x', 'y', 'z'), 'a{{zbx}}cy', 'double curly very hard');
	strictEqual(locale.format('a{{{{{{{2}b{0}}}}}}}c{1}', 'x', 'y', 'z'), 'a{{{zbx}}}cy', 'double curly very very hard');
});

test('extract locale code', function() {
	strictEqual(locale.extractLocaleCode('en-us'), 'en-us', 'simple locale');
	strictEqual(locale.extractLocaleCode('en-us,de-de,es-es'), 'en-us', 'multiple locales');
	strictEqual(locale.extractLocaleCode('fr-fr,en-us;q=0.8,fr;q=0.5,en;q=0.3'), 'fr-fr', 'multiple locales with quality value');
});

asyncTest('resources', 5, function(_) {
	strictEqual(locale.format(module, 'hello'), 'hello world!', 'en only');
	locale.setCurrent(_, 'en-US');
	strictEqual(locale.format(module, 'trucks', 2), 'two trucks', 'en-US');
	locale.setCurrent(_, 'en-GB');
	strictEqual(locale.format(module, 'trucks', 2), 'two lorries', 'en-GB');
	locale.setCurrent(_, 'fr-FR');
	strictEqual(locale.format(module, 'trucks', 2), 'deux camions', 'fr-FR');
	locale.setCurrent(_, 'it-IT');
	strictEqual(locale.format(module, 'trucks', 2), 'two trucks', 'it-IT (missing => en-US)');
	start();
});