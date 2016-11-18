"use strict";

exports.endpoint = {
	contract: {
		application: "x3stub",
		contract: "erp",
		entities: {
			AUTILISINI: require("./entities/AUTILISINI").entity,
			ASYRAUS: require("./entities/ASYRAUS").entity,
			ASYRMET: require("./entities/ASYRMET").entity
		}

	}
};