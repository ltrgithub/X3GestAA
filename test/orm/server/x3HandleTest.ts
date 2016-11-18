"use strict";

import { _ } from 'streamline-runtime';
declare function it(name: string, test: (_: _) => any): any;
import { assert } from 'chai';
const ok = assert.ok;
const strictEqual = assert.strictEqual;
const deepEqual = assert.deepEqual;

import { helpers } from '@sage/syracuse-core';
import { inspect } from 'util';
var x3Handle = require("../../../src/orm//dbHandles/x3");
var pool = require("./rsrc/x3HandlePoolStub");
var tracer; // = console.log;


describe(module.id, () => {
	var handle;

	it('Initialize', function (_) {
		x3Handle.setup({
			x3driver: pool
		});
		var ep = {
			$uuid: helpers.uuid.generate(),
			getBaseUrl: function (_) {
				return "";
			},
			getModel: function (_) {
				return x3Handle.makeModel(_, this);
			},
			useEtna(_) {
				return false;
			}
		};
		// create with endpoint stub
		handle = x3Handle.create(_, ep);
		ok(true, "initialized");
		//
	});

	it('Entity creation test', function (_) {
		var entity = handle.getEntity(_, "TestA");
		tracer && tracer("entity (47): " + inspect(entity, null, 4));
		strictEqual(Object.keys(entity.$properties).length, 5, "Properties count ok");
		strictEqual(entity.$properties.CODFIC.$type, "string", "CODFIC type ok");
		strictEqual(entity.$properties.CODFIC.$title, "Code table", "CODFIC title ok");
		strictEqual(entity.$properties.MODULE.$type, "integer", "MODULE type ok");
		deepEqual(entity.$properties.MODULE.$enum, [{
			$value: 1,
			$title: "Tronc commun"
		}, {
			$value: 2,
			$title: "Interne superviseur"
		}, {
			$value: 3,
			$title: "Interface compta"
		}], "MODULE $enum ok");
		strictEqual(Object.keys(entity.$relations).length, 2, "Relations count ok");
		strictEqual(entity.$relations.CODACT_REF.targetEntity.name, "ACTIV", "CODACT_REF target entity type ok");
		ok(!entity.$relations.CODACT_REF.isPlural, "CODACT_REF not plural ok");
		strictEqual(entity.$relations.ATBCHAMPS.targetEntity.name, "ATBCHAMPS", "ATBCHAMPS target entity type ok");
		ok(entity.$relations.ATBCHAMPS.isPlural, "ATBCHAMPS plural ok");
		// get prototype test
		var detProto = entity.getPrototype(_, entity.name, "$details");
		strictEqual(detProto.$properties.CODFIC.$title, "{@6}", "$details original proto ok");
		var detProto = entity.getPrototype(_, entity.name, "$query");
		strictEqual(detProto.$properties.$resources.$item.$properties.CODFIC.$title, "{@6}", "$query original proto ok");
		//
	});

	it('Fetch test', function (_) {
		var testAEntity = handle.getEntity(_, "TestA");
		var inst = handle.fetchInstance(_, testAEntity, "ABATCAL");
		tracer && tracer("instance (66): " + inspect(inst._data, null, 4));
		//
		strictEqual(inst.CODFIC(_), "ABATCAL", "Read string ok");
		strictEqual(inst.MODULE(_), 1, "Read enum ok");
		strictEqual(inst.CODACT_REF(_).CODACT(_), "A1", "Read ref prop ok");
		strictEqual(inst.ATBCHAMPS(_).getLength(), 2, "Children count ok");
		strictEqual(inst.ATBCHAMPS(_).toArray(_)[0].CODZONE(_), "COD", "Child read ok");
		strictEqual(inst.ATBCHAMPS(_).toArray(_)[0].ACTZON_REF(_), null, "Child null ref ok");
		//
		var instArray = handle.fetchInstances(_, testAEntity, {});
		strictEqual(instArray.length, 2, "fetchInstances length ok");
		strictEqual(instArray[0].CODFIC(_), "AABREV", "First fetch ok");

	});

	it('Company test', function (_) {
		var entity = handle.getEntity(_, "COMPANY", "$query");
		tracer && tracer("entity (102): " + inspect(entity, null, 5));
		var instArray = handle.fetchInstances(_, entity, {});
		tracer && tracer("result (104): " + inspect(instArray, null, 5));
		strictEqual(instArray.length, 1, "fetchInstances length ok");
		strictEqual(instArray[0].CPY(_).CPY(_), "455", "CPY ok (first level)");
		strictEqual(instArray[0].CNTNAM(_), "000000000004709", "CNTNAM ok (first level)");
		var bpas = instArray[0].BPA(_).toArray(_);
		strictEqual(bpas.length, 1, "BPAs length ok");
		strictEqual(bpas[0].BPANUM(_), "455", "BPANUM ok (second level)");

	});
	/*
	it('Empty query cursor', function(_) {
		var entity = handle.getEntity(_, "EMPTY_QRY", "$query");
		tracer && tracer("entity (115): " + inspect(entity, null, 5));
		var cursor = handle.createCursor(_, entity, {}, "$query");
		var next = cursor.next(_);
		tracer && tracer("next is (118): " + inspect(next));
		ok(next == null, "Next is null ok");
		
	});
	*/
});