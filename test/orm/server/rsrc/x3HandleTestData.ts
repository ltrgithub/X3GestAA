"use strict";

exports.prototypes = {
	"EMPTY_QRY.$query": {
		"$baseUrl": "/sdata/x3/erp/SUPERV",
		"$baseType": "application/json;vnd.sage=syracuse;vnd.sage.syracuse.representation=x3.erp.SUPERV",
		"$url": "{$baseUrl}/ATABLE?representation=ATABLE.$query",
		"$title": "{@709}",
		"$itemsPerPage": 0,
		"$type": "{$baseType}.ATABLE.$query",
		"$properties": {
			"$resources": {
				"$type": "application/x-array",
				"$item": {
					"$url": "{$baseUrl}/ATABLE('{$key}')?representation=ATABLE.$queryItem",
					"$type": "{$baseType}.ATABLE.$queryItem",
					"$key": "{CODFIC}",
					"$properties": {
						"description": {
							"$title": "desc",
							"$capabilities": "sort,filter",
							"$type": "application/x-string"
						}
					}
				}
			}
		}
	},
	"TestA.$query": {
		"$baseUrl": "/sdata/x3/erp/SUPERV",
		"$baseType": "application/json;vnd.sage=syracuse;vnd.sage.syracuse.representation=x3.erp.SUPERV",
		"$url": "{$baseUrl}/TestA?representation=TestA.$query",
		"$title": "{@709}",
		"$itemsPerPage": 0,
		"$type": "{$baseType}.TestA.$query",
		"$properties": {
			"$resources": {
				"$type": "application/x-array",
				"$item": {
					"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$queryItem",
					"$type": "{$baseType}.TestA.$queryItem",
					"$key": "{CODFIC}",
					"$properties": {
						"CODFIC": {
							"$title": "{@6}",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",

							"$maxLength": 12,
							"$links": {
								"$details": {
									"$title": "{@709}",
									"$type": "application/json;vnd.sage=syracuse",
									"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
								},
								"$summary": {
									"$title": "{@25036}",
									"$type": "application/json;vnd.sage=syracuse",
									"$url": "{$baseUrl}/TestA?representation=TestA.$summary"
								}
							}
						},
						"MODULE": {
							"$title": "{@943}",
							"$capabilities": "sort,filter",
							"$type": "application/x-choice",
							"$value": {
								"$type": "application/x-integer",

								"$enum": [{
									"$value": 1,
									"$title": "Tronc commun"
								}, {
									"$value": 2,
									"$title": "Interne superviseur"
								}, {
									"$value": 3,
									"$title": "Interface compta"
								}]
							}
						},
					},
					"$links": {
						"$edit": {
							"$title": "{@25313}",
							"$type": "application/json;vnd.sage=syracuse",
							"$method": "POST",
							"$url": "{$baseUrl}/TestA('{$key}')/$workingCopies?representation=TestA.$edit"
						},
						"$delete": {
							"$title": "{@12331}",
							"$type": "application/json;vnd.sage=syracuse",
							"$method": "DELETE",
							"$confirm": "Voulez-vous supprimer l'enregistrement",
							"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
						},
						"$print": {
							"$title": "{@22582}",
							"$type": "application/pdf",
							"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
						},
						"$excel": {
							"$title": "{@23587}",
							"$type": "application/syracuse-excel-worksheet",
							"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
						}
					}
				}
			}
		},
		"$links": {
			"$print": {
				"$title": "{@22582}",
				"$type": "application/pdf",
				"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$query"
			},
			"$excel": {
				"$title": "{@23587}",
				"$type": "application/syracuse-excel-worksheet",
				"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$query"
			},
			"$create": {
				"$title": "{@27709}",
				"$type": "application/json;vnd.sage=syracuse",
				"$method": "POST",
				"$url": "{$baseUrl}/TestA/$template/$workingCopies?representation=TestA.$edit"
			}
		},
		"$localization": {
			"@12": "Type de table",
			"@12331": "Supprimer",
			"@2": "Abréviation table",
			"@22582": "Imprimer",
			"@23587": "Excel",
			"@25036": "Résumé",
			"@25313": "Modifier",
			"@27709": "Créer",
			"@6": "Code table",
			"@709": "Dictionnaire de données",
			"@9": "Intitulé de la table",
			"@943": "Module"
		}
	},
	"TestA.$details": {
		"$baseUrl": "/sdata/x3/erp/SUPERV",
		"$baseType": "application/json;vnd.sage=syracuse;vnd.sage.syracuse.representation=x3.erp.SUPERV",
		"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details",
		"$title": "{@709}",
		"$type": "{$baseType}.TestA.$details",
		"$key": "{CODFIC}",
		"$properties": {
			"CODFIC": {
				"$title": "{@6}",
				"$type": "application/x-string",

				"$maxLength": 12,
				"$links": {
					"$query": {
						"$title": "{@27982}",
						"$type": "application/json;vnd.sage=syracuse",
						"$url": "{$baseUrl}/TestA?representation=TestA.$query"
					},
					"$summary": {
						"$title": "{@25036}",
						"$type": "application/json;vnd.sage=syracuse",
						"$url": "{$baseUrl}/TestA?representation=TestA.$summary"
					}
				}
			},
			"MODULE": {
				"$title": "{@943}",
				"$type": "application/x-choice",
				"$value": {
					"$type": "application/x-integer",

					"$enum": [{
						"$value": 1,
						"$title": "Tronc commun"
					}, {
						"$value": 2,
						"$title": "Interne superviseur"
					}, {
						"$value": 3,
						"$title": "Interface compta"
					}]
				}
			},
			"CODACT_REF": {
				"$title": "{@4}",
				"$type": "application/x-reference",
				"$url": "{$baseUrl}/ACTIV('{$key}')?representation=ACTIV.$thumb",
				"$key": "{CODACT}",
				"$properties": {
					"CODACT": {
						"$type": "application/x-string",

						"$maxLength": 5
					}
				},
				"$links": {
					"$details": {
						"$title": "{@4}",
						"$type": "application/json;vnd.sage=syracuse",
						"$url": "{$baseUrl}/ACTIV('{CODACT_REF}')?representation=ACTIV.$details"
					},
					"$query": {
						"$title": "{@27982}",
						"$type": "application/json;vnd.sage=syracuse",
						"$url": "{$baseUrl}/ACTIV?representation=ACTIV.$query"
					},
					"$summary": {
						"$title": "{@25036}",
						"$type": "application/json;vnd.sage=syracuse",
						"$url": "{$baseUrl}/ACTIV?representation=ACTIV.$summary"
					}
				}
			},
			"FLG130": {
				"$title": "{@20232}",
				"$type": "application/x-boolean"
			},
			"NBENREG": {
				"$title": "{@10}",
				"$type": "application/x-integer",

				"$maxLength": 8
			},
			"FICCFG": {
				"$title": "{@20175}",
				"$type": "application/x-binary",
				"$url": "{$baseUrl}/TEXT('FILE_CFG~{CODFIC}~{FICCFG}')"
			},
			"ATBCHAMPS": {
				"$type": "application/x-array",
				"$maxItems": 350,
				"$minItems": 1,
				"$item": {
					"$type": "application/json",
					"$properties": {
						"CODZONE": {
							"$title": "{@20}",
							"$type": "application/x-string",

							"$maxLength": 12
						},
						"ACTZON_REF": {
							"$title": "{@4}",
							"$type": "application/x-reference",
							"$url": "{$baseUrl}/ACTIV('{$key}')?representation=ACTIV.$thumb",
							"$key": "{ACTZON}",
							"$properties": {
								"ACTZON": {
									"$type": "application/x-string",

									"$maxLength": 5
								}
							},
							"$links": {
								"$details": {
									"$title": "{@4}",
									"$type": "application/json;vnd.sage=syracuse",
									"$url": "{$baseUrl}/ACTIV('{ACTZON_REF}')?representation=ACTIV.$details"
								},
								"$query": {
									"$title": "{@27982}",
									"$type": "application/json;vnd.sage=syracuse",
									"$url": "{$baseUrl}/ACTIV?representation=ACTIV.$query"
								},
								"$summary": {
									"$title": "{@25036}",
									"$type": "application/json;vnd.sage=syracuse",
									"$url": "{$baseUrl}/ACTIV?representation=ACTIV.$summary"
								}
							}
						}
					}
				}
			}
		},
		"$links": {
			"$edit": {
				"$title": "{@25313}",
				"$type": "application/json;vnd.sage=syracuse",
				"$method": "POST",
				"$url": "{$baseUrl}/TestA('{$key}')/$workingCopies?representation=TestA.$edit"
			},
			"$delete": {
				"$title": "{@12331}",
				"$type": "application/json;vnd.sage=syracuse",
				"$method": "DELETE",
				"$confirm": "Voulez-vous supprimer l'enregistrement",
				"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
			},
			"$print": {
				"$title": "{@22582}",
				"$type": "application/pdf",
				"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
			},
			"$excel": {
				"$title": "{@23587}",
				"$type": "application/syracuse-excel-worksheet",
				"$url": "{$baseUrl}/TestA('{$key}')?representation=TestA.$details"
			},
			"$duplicate": {
				"$title": "{@27971}",
				"$type": "application/json;vnd.sage=syracuse",
				"$method": "POST",
				"$url": "{$baseUrl}/TestA"
			},
			"$query": {
				"$title": "{@27982}",
				"$type": "application/json;vnd.sage=syracuse",
				"$url": "{$baseUrl}/TestA?representation=TestA.$query"
			}
		},
		"$localization": {
			"@10": "Nb enregistrements",
			"@100": "Valeur paramètre",
			"@1043": "Fonctions",
			"@11485": "Workflow",
			"@12": "Type de table",
			"@122": "Valeur",
			"@12302": "Test mb",
			"@12331": "Supprimer",
			"@1261": "Champ",
			"@129": "Champs",
			"@1390": "Index",
			"@14": "Flag annulation",
			"@15": "Type de données",
			"@15059": "Vérification",
			"@2": "Abréviation table",
			"@20": "Code champ",
			"@20175": "Fichier de configuration",
			"@20232": "Format 130",
			"@21": "Dimension",
			"@22582": "Imprimer",
			"@23": "Table liée",
			"@23139": "Audit",
			"@23151": "Audit création",
			"@23152": "Audit modification",
			"@23153": "Audit suppression",
			"@23154": "Champs audités",
			"@23155": "Type d'audit",
			"@23587": "Excel",
			"@23601": "Clé de suivi",
			"@24": "Longueur champ",
			"@24619": "Génération textes",
			"@24741": "Accès non sécurisé",
			"@24975": "Audit BI",
			"@25036": "Résumé",
			"@25313": "Modifier",
			"@25758": "Copie législation",
			"@25796": "Opérateur",
			"@26": "Texte abrégé",
			"@27": "Texte normal",
			"@27051": "Audit S-Data",
			"@27128": "Clé S-Data",
			"@27468": "Index cluster",
			"@27971": "Dupliquer",
			"@27982": "Lister",
			"@28": "No menu local",
			"@2943": "Clé",
			"@2946": "Type livraison",
			"@30": "Texte long",
			"@31": "Lien obligatoire",
			"@33": "Options de saisie",
			"@38": "Code index",
			"@39": "Descripteur index",
			"@3990": "Remise à zéro",
			"@4": "Code activité",
			"@40": "Flag homonymes",
			"@4787": "Général",
			"@4867": "Champ intitulé court",
			"@6": "Code table",
			"@7": "Champ intitulé",
			"@709": "Dictionnaire de données",
			"@710": "Type de base",
			"@711": "Type de copie",
			"@712": "Option de copie",
			"@77": "Mot-clé d'aide",
			"@881": "Paramètres",
			"@9": "Intitulé de la table",
			"@943": "Module",
			"@946": "Gestion dossier",
			"@947": "Gestion table",
			"@988": "Expression de lien",
			"@99": "Code paramètre"
		}
	},
	"COMPANY.$query": {
		"$baseUrl": "/sdata/x3/erp/sosy_superv",
		"$baseType": "application/json;vnd.sage=syracuse;vnd.sage.syracuse.representation=x3.erp.SUPERV",
		"$url": "{$baseUrl}/COMPANY?representation=COMPANY.$search",
		"$prototype": "{$baseUrl}/$prototype('{$representation}.$thumb')",
		"$type": "{$baseType}.COMPANY.$search",
		"$properties": {
			"$resources": {
				"$type": "application/x-array",
				"$item": {
					"$url": "{$baseUrl}/COMPANY('{$key}')?representation=COMPANY.searchItem",
					"$key": "{CPY}",
					"$properties": {
						"CPY": {
							"$type": "application/x-reference",
							"$key": "{CPY}",
							"$value": "{CPY}",
							"$properties": {
								"CPY": {
									"$title": "Société",
									"$capabilities": "sort,filter",
									"$type": "application/x-string",
									"$maxLength": 5
								}
							}
						},
						"CPYNAM": {
							"$title": "Raison sociale",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 35
						},
						"CPYSHO": {
							"$title": "Intitulé court",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 10
						},
						"LEG": {
							"$title": "Législation",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 20
						},
						"MAIFCY": {
							"$type": "application/x-reference",
							"$key": "{MAIFCY}",
							"$value": "{MAIFCY}",
							"$properties": {
								"$title": "Site principal",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 5
							}
						},
						"CRY": {
							"$type": "application/x-reference",
							"$key": "{CRY}",
							"$value": "{CRY}",
							"$properties": {
								"$title": "Pays",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 3
							}
						},
						"CRN": {
							"$title": "Numéro de SIREN",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 20
						},
						"NAF": {
							"$title": "Code NAF",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 10
						},
						"NID": {
							"$title": "No identification",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 80
						},
						"CPYLOG": {
							"$title": "Forme juridique",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 0
						},
						"RGCCUR": {
							"$type": "application/x-reference",
							"$key": "{RGCCUR}",
							"$value": "{RGCCUR}",
							"$properties": {
								"$title": "Devise capital",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 3
							}
						},
						"BPAADD": {
							"$title": "Adresse par défaut",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 5
						},
						"CNTNAM": {
							"$title": "Contact",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 15
						},
						"BIDNUM": {
							"$title": "Numéro RIB",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 30
						},
						"EECNUM": {
							"$title": "Numéro de TVA",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 20
						},
						"CREUSR": {
							"$type": "application/x-reference",
							"$key": "{CREUSR}",
							"$value": "{CREUSR}",
							"$properties": {
								"$title": "Opérateur création",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 5
							}
						},
						"UPDUSR": {
							"$type": "application/x-reference",
							"$key": "{UPDUSR}",
							"$value": "{UPDUSR}",
							"$properties": {
								"$title": "Opérateur modif",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 5
							}
						},
						"ACCCUR": {
							"$type": "application/x-reference",
							"$key": "{ACCCUR}",
							"$value": "{ACCCUR}",
							"$properties": {
								"$title": "Devise comptable",
								"$capabilities": "sort,filter",
								"$type": "application/x-string",
								"$maxLength": 3
							}
						},
						"STAFED": {
							"$title": "Etat fédéral",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 20
						},
						"KACT": {
							"$title": "Activ.Pr.Société",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 0
						},
						"EDISAGECOD": {
							"$title": "Code EDI SAGE",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 0
						},
						"DRTCERTIF": {
							"$title": "Certificat",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 0
						},
						"DUNSCOD": {
							"$title": "DUNS",
							"$capabilities": "sort,filter",
							"$type": "application/x-string",
							"$maxLength": 0
						},
						"BPA": {
							"$type": "application/x-array",
							"$minItems": 0,
							"$item": {
								"$type": "application/x-json",
								"$properties": {
									"BPANUM": {
										"$title": "Entité",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 15
									},
									"BPAADD": {
										"$title": "Adresse",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 5
									},
									"BPADES": {
										"$title": "Intitulé",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 30
									},
									"BPABID": {
										"$title": "Par défaut",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 30
									},
									"TYPADD": {
										"$title": "Type",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 20
									},
									"POSCOD": {
										"$type": "application/x-reference",
										"$key": "{POSCOD}",
										"$value": "{POSCOD}",
										"$properties": {
											"$title": "Code postal",
											"$capabilities": "sort,filter",
											"$type": "application/x-string",
											"$maxLength": 10
										}
									},
									"CTY": {
										"$title": "Ville",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 40
									},
									"CODSEE": {
										"$title": "Code INSEE",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"SAT": {
										"$title": "Etat",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 35
									},
									"CRY": {
										"$type": "application/x-reference",
										"$key": "{CRY}",
										"$value": "{CRY}",
										"$properties": {
											"$title": "Pays",
											"$capabilities": "sort,filter",
											"$type": "application/x-string",
											"$maxLength": 3
										}
									},
									"CRYNAM": {
										"$title": "Nom pays",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 40
									},
									"FAX": {
										"$title": "Fax",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 20
									},
									"MOB": {
										"$title": "Portable",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 20
									},
									"FCYWEB": {
										"$title": "Site Web",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"EXTNUM": {
										"$title": "Identifiant externe",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"CREUSR": {
										"$type": "application/x-reference",
										"$key": "{CREUSR}",
										"$value": "{CREUSR}",
										"$properties": {
											"$title": "Opérateur création",
											"$capabilities": "sort,filter",
											"$type": "application/x-string",
											"$maxLength": 5
										}
									},
									"UPDUSR": {
										"$type": "application/x-reference",
										"$key": "{UPDUSR}",
										"$value": "{UPDUSR}",
										"$properties": {
											"$title": "Opérateur modif",
											"$capabilities": "sort,filter",
											"$type": "application/x-string",
											"$maxLength": 5
										}
									},
									"EDISAGECOD": {
										"$title": "Code EDI SAGE",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"GLNCOD": {
										"$title": "GLN",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"CRN": {
										"$title": "Numéro SIRET",
										"$capabilities": "sort,filter",
										"$type": "application/x-string",
										"$maxLength": 0
									},
									"BPADDLI": {
										"$type": "application/x-array",
										"$minItems": 1,
										"$maxItems": 3,
										"$item": {
											"$type": "application/x-json",
											"$properties": {
												"BPAADDLIG": {
													"$title": "Ligne adresse",
													"$capabilities": "sort,filter",
													"$type": "application/x-string",
													"$maxLength": 50
												}
											}
										}
									},
									"CTEL": {
										"$type": "application/x-array",
										"$minItems": 5,
										"$maxItems": 5,
										"$item": {
											"$type": "application/x-json",
											"$properties": {
												"TEL": {
													"$title": "Téléphone",
													"$capabilities": "sort,filter",
													"$type": "application/x-string",
													"$maxLength": 20
												}
											}
										}
									},
									"CWEB": {
										"$type": "application/x-array",
										"$minItems": 1,
										"$maxItems": 5,
										"$item": {
											"$type": "application/x-json",
											"$properties": {
												"WEB": {
													"$title": "Adresse internet",
													"$capabilities": "sort,filter",
													"$type": "application/x-string",
													"$maxLength": 80
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
};

exports.data = {
	"TestA": {
		"ABATCAL": {
			"$uuid": "0f2a4f6a-c0c7-48f6-90ef-f40b7733a727",
			"$etag": "2009-01-14T00:00:00Z",
			"CODFIC": "ABATCAL",
			"ABRFIC": "ABC",
			"MODULE": 1,
			"INTIT": "DES",
			"INTITC": "",
			"INTITFIC": "Calendrier serveur batch",
			"TYPDBA": 3,
			"FLG130": false,
			"NBENREG": 500,
			"GENTRA": false,
			"ZERO": false,
			"SECURE": true,
			"TYPFIC": 3,
			"CRE": 1,
			"OPT": 1,
			"FLGLEG": false,
			"TYPDLV": 2,
			"FICCFG": {},
			"AUDCRE": false,
			"AUDUPD": false,
			"AUDDEL": false,
			"AUDWRK": false,
			"AUDBI": false,
			"AUDSDA": false,
			"AUDCLE": "",
			"ASDCLE": "",
			"CODACT_REF": {
				"CODACT": "A1"
			},
			"ATBCHAMPS": [{
				"$uuid": "7e7752de-8b4f-47b6-9371-c7aeac3a7ddb",
				"$etag": "0000-00-00T00:00:00Z",
				"CODZONE": "COD",
				"CODTYP": "ABC",
				"NOLIB": 0,
				"LONG": 0,
				"DIME": 1,
				"NOCOURT": "Calendrier",
				"NOABREG": "Calendrier",
				"NOLONG": "Calendrier",
				"OPTION": "",
				"EXPLIEN": "",
				"CHPLEG": false,
				"ANNUL": 2,
				"VERIF": false,
				"AGECAP": "'{WREP.ATB.ATZ2(1).AGECAP}'<error Utilisation d'une référence nulle ou invalide>",
				"OBLIG": true,
				"NULZON": false,
				"MOTCLE": "",
				"ACTZON_REF": {
					"ACTZON": ""
				}
			}, {
				"$uuid": "90f3dee8-c9e2-4c5d-b4c3-631d4df16432",
				"$etag": "0000-00-00T00:00:00Z",
				"CODZONE": "DES",
				"CODTYP": "DES",
				"NOLIB": 0,
				"LONG": 0,
				"DIME": 1,
				"NOCOURT": "Désignation",
				"NOABREG": "Désignation",
				"NOLONG": "Désignation",
				"OPTION": "",
				"EXPLIEN": "",
				"CHPLEG": false,
				"ANNUL": 1,
				"VERIF": false,
				"AGECAP": "'{WREP.ATB.ATZ2(2).AGECAP}'<error Utilisation d'une référence nulle ou invalide>",
				"OBLIG": false,
				"NULZON": false,
				"MOTCLE": "",
				"ACTZON_REF": {
					"ACTZON": ""
				}
			}]
		},
		"$query": {
			"$resources": [{
				"$uuid": "25a972bf-0498-468a-90eb-deee0cafaaa7",
				"$etag": "2012-09-19T14:55:35Z",
				"CODFIC": "AABREV",
				"ABRFIC": "AAB",
				"MODULE": 1,
				"INTITFIC": "Abbreviation",
				"TYPFIC": 3
			}, {
				"$uuid": "0f2a4f6a-c0c7-48f6-90ef-f40b7733a727",
				"$etag": "2009-01-14T00:00:00Z",
				"CODFIC": "ABATCAL",
				"ABRFIC": "ABC",
				"MODULE": 1,
				"INTITFIC": "Batch server calendar",
				"TYPFIC": 3
			}]
		}
	},
	"ACTIV": {
		"A1": {
			"CODACT": "A1"
		}
	},
	"COMPANY": {
		"$query": {
			"$resources": [{
				"CPY": {
					"CPY": "455"
				},
				"CPYNAM": "",
				"CPYSHO": "",
				"LEG": "FRA",
				"MAIFCY": "451",
				"CRY": "FR",
				"CRN": "",
				"NAF": "",
				"NID": "",
				"CPYLOG": "e",
				"RGCCUR": "FRF",
				"BPAADD": "ABC",
				"CNTNAM": "000000000004709",
				"BIDNUM": "",
				"EECNUM": "",
				"CREUSR": "PP",
				"UPDUSR": "CCL",
				"ACCCUR": "",
				"STAFED": "",
				"KACT": "",
				"EDISAGECOD": "",
				"DRTCERTIF": "",
				"DUNSCOD": "",
				"BPA": [{
					"BPANUM": "455",
					"BPAADD": "ABC",
					"BPADES": "01234567890123456789",
					"BPABID": "",
					"TYPADD": "PRI",
					"POSCOD": "75001",
					"CTY": "PARIS 01",
					"CODSEE": "75101",
					"SAT": "",
					"CRY": "FR",
					"CRYNAM": "",
					"FAX": "4545454555",
					"MOB": "",
					"FCYWEB": "",
					"EXTNUM": "454",
					"CREUSR": "BY",
					"UPDUSR": "CCORA",
					"EDISAGECOD": "",
					"GLNCOD": "",
					"CRN": "",
					"BPADDLI": [],
					"CTEL": [{
						"TEL": "0445562625"
					}, {
						"TEL": "4545454555"
					}, {
						"TEL": ""
					}, {
						"TEL": ""
					}],
					"CWEB": [{
						"WEB": "45454545"
					}]
				}]
			}]
		}
	},
	"EMPTY_QRY": {
		"$query": {
			"$resources": []
		}
	}
};