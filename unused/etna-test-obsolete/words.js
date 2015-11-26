"use strict";
// Test Syracuse Dom 1
// Un petit test sur diverses fonctions de chaînes : vireblc, string$, sigma, right$, mid$, len
// au passage on utilise aussi rnd
// Utilisation de for, switch, func, variables globales et locales, variables passées en valeur dans
// des sous-programmes
// Quelques déclarations (toutes ne sont pas faites à dessein)
var functions = require("etna/lib/engine/runtime").functions;
var vireblc = functions.VIREBLC.fn;
var string$ = functions.STRING$.fn;
var space$ = functions.SPACE$.fn;
var max = Math.max;
var mid$ = functions.MID$.fn;
var right$ = functions.RIGHT$.fn;
var rnd = functions.RND.fn;
var instr = functions.INSTR.fn;
var ctrans = functions.CTRANS.fn;
var intx = Math.floor;
var Errbox = console.error;

var PONCTUATION = ",.;:!?/*-+='" + '"' + "{([<|>])}";
var OPTION_TRACE = 1;
var FICHIER_TRACE; // = filpath("TRA", trtcou, "tra")
var TIME_START = Date.now();

for (var REPETONS = 1; REPETONS <= 100000; REPETONS++) {
	var CHAINE = "";
	for (var I = 0; I <= 10; I++) {

		switch (I) {
			case 0:
				CHAINE += PONCTUONS(5);
				break;
			case 1:
				CHAINE += "hun" + PONCTUONS(I);
				break;
			case 2:
				CHAINE += "d'eux" + PONCTUONS(I);
				break;
			case 3:
				CHAINE += "Troie" + PONCTUONS(I);
				break;
			case 4:
				CHAINE += "carte" + PONCTUONS(I);
				break;
			case 5:
				CHAINE += "sync" + PONCTUONS(I);
				break;
			case 6:
				CHAINE += "size" + PONCTUONS(I);
				break;
			case 7:
				CHAINE += "cette" + PONCTUONS(I);
				break;
			case 8:
				CHAINE += "huitre" + PONCTUONS(I);
				break;
			case 9:
				CHAINE += "neuve" + PONCTUONS(I);
				break;
			case 10:
				CHAINE += "dise" + PONCTUONS(I);
				break;
		}
		var J = COMPTE_MOTS(CHAINE);
		var K = DECOMPTE_MOTS(CHAINE);
		var L = RECOMPTE_MOTS(CHAINE);

		if (REPETONS == 1) TRACE_ERRBOX(CHAINE + "  ==>" + J + " mot" + string$(J > 1, "s"));

		if (J != I + (I >= 2)) TRACE_ERRBOX("Erreur : la longueur calculée par COMPTE_MOTS n'est pas bonne " + J);
		if (J != K) TRACE_ERRBOX("Erreur : la longueur calculée par DECOMPTE_MOTS n'est pas bonne " + K);

		if (J != L) TRACE_ERRBOX("Erreur : la longueur calculée par RECOMPTE_MOTS n'est pas bonne " + K);

	}
}
console.error("Time : " + (Date.now() - TIME_START) / 1000);
console.error(Math.floor(process.memoryUsage().heapUsed / (1024 * 1024)) + " MB heap used");

// Décompte du nombre de mots dans une chaine
function COMPTE_MOTS(CHAINE) {

	// un peu de nettoyage d'abord
	CHAINE = vireblc(vireblc(ctrans(CHAINE, PONCTUATION, space$(PONCTUATION.length)), 5), 2);
	//ErrBox("cleaned: " + CHAINE)
	// Et voilà !
	return CHAINE.length - vireblc(CHAINE, 4).length + (CHAINE.length != 0);
}

// Décompte du nombre de mots dans une chaine, second algorithme
function DECOMPTE_MOTS(CHAINE) {

	// un peu de nettoyage d'abord
	CHAINE = vireblc(vireblc(ctrans(CHAINE, PONCTUATION, space$(PONCTUATION.length)), 5), 2);

	K = 0;
	while (CHAINE != "") {
		K += 1;
		CHAINE = vireblc(right$(CHAINE, 1 + vireblc(CHAINE, 3).length), 2);
	}

	// Et voilà !
	return K;
}

// Décompte du nombre de mots dans une chaine, troisième algorithme
function RECOMPTE_MOTS(CHAINE) {

	// un peu de nettoyage d'abord
	CHAINE = vireblc(vireblc(ctrans(CHAINE, PONCTUATION, space$(PONCTUATION.length)), 5), 2);

	var K = 0,
		L = 0;
	if (CHAINE != "") {
		do {
			L = instr(L + 1, CHAINE, " ");
			K += 1;
			if (L == 0) break;
		}
		while (1 == 1);
	}

	// Et voilà !
	return K;
}

// Une ponctuation au hasard
function PONCTUONS(I) {
	var s = " ";
	for (var j = 1; j <= max(I, 1); j++)
		s += mid$(PONCTUATION, intx(1 + rnd(PONCTUATION.length)), 1);
	return s + " ";
}

// Trace à l'écran ou en fichier
function TRACE_ERRBOX(CHAINE) {

	if (OPTION_TRACE == 1) {
		Errbox(CHAINE);
	} else {
		// Append, je sais que ce n'est pas optimisé, mais c'est fait exprès, na !!!
		/*Openo FICHIER_TRACE, -1
		 adxifs=chr$(13)+chr$(10) : adxirs=""
		 Wrseq CHAINE
		 Openo*/
	}
}