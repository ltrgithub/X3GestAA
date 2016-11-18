"use strict";
var config = require('config'); // must be first
var registry = require("../..//src/sdata/sdataRegistry");

var strings = require('./strings');
exports.contract = {
	application: "syracuse",
	contract: "collaboration",
	strings: strings, // necessary to be able to extend contract resources
	resources: strings.resources,
	resources2: strings.resources2,
	entities: {
		about: require('./entities/about').entity,
		aboutEndpoint: require('./entities/aboutEndpoint').entity,
		//
		user: require('./entities/user/user').entity,
		licenseData: require('./entities/licenseData').entity,
		licensePartData: require('./entities/licensePartData').entity,
		licenseParameterData: require('./entities/licenseParameterData').entity,
		licenseBadgeData: require('./entities/licenseBadgeData').entity,
		licenseView: require('./entities/licenseView').entity,
		licenseViewItem: require('./entities/licenseViewItem').entity,
		licenseSessionTypeData: require('./entities/licenseSessionTypeData').entity,
		licenseModuleData: require('./entities/licenseModuleData').entity,
		licenseWsOld: require('./entities/licenseWsOld').entity,
		stackTranslation: require('./entities/stackTranslation').entity,
		group: require('./entities/user/group').entity,
		role: require('./entities/user/role').entity,
		roleBoProfile: require('./entities/user/roleBoProfile').entity,
		menuProfileToRole: require('./entities/user/menuProfileToRole').entity,
		roleToProfessionCode: require('./entities/user/roleToProfessionCode').entity,
		userEndpoint: require('./entities/user/userEndpoint').entity,
		userOAuth2: require('./entities/user/userOAuth2').entity,
		professionCode: require('./entities/user/professionCode').entity,
		userProfile: require('./entities/user/userProfile').entity,
		userPreference: require('./entities/user/userPreference').entity,
		userBookmark: require('./entities/user/userBookmark').entity,
		userBookmarkProxy: require('./entities/user/userBookmarkProxy').entity,
		oauth2: require('./entities/user/oauth2').entity,
		saml2: require('./entities/user/saml2').entity,
		ldap: require('./entities/user/ldap').entity,
		ldapAttributeName: require('./entities/user/ldapAttributeName').entity,
		ldapGroup: require('./entities/user/ldapGroup').entity,
		x3UserImport: require('./entities/user/x3UserImport').entity,
		x3RightsCache: require('./entities/user/x3RightsCache').entity,
		userRepresentationPref: require('./entities/user/userRepresentationPref').entity,
		deleted: require('./entities/deleted').entity,
		endPoint: require('./entities/endPoint').entity,
		badge: require('./entities/badge').entity,
		localePreference: require('./entities/localePreference').entity,
		application: require('./entities/application').entity,
		applicationConnectionItem: require('./entities/applicationConnectionItem').entity,
		x3server: require('./entities/x3server').entity,
		x3solution: require('./entities/x3solution').entity,
		friendServer: require('./entities/friendServer').entity,
		license: require('./entities/license').entity,
		patch: require('./entities/patch').entity,
		apatch: require('./entities/apatch').entity,
		host: require('./entities/host').entity,
		connectionData: require('./entities/connectionData').entity,
		certificate: require('./entities/certificate').entity,
		caCertificate: require('./entities/caCertificate').entity,
		patchLevel: require('./entities/patchLevel').entity,
		setting: require('./entities/setting').entity,
		tenant: require('./entities/tenant').entity,
		loginToken: require('./entities/loginToken').entity,
		sagePaySession: require('./entities/sagePaySession').entity,
		// tools
		exportProfile: require('./entities/import_export/exportProfile').entity,
		exportProfileItem: require('./entities/import_export/exportProfileItem').entity,
		exportProfileObject: require('./entities/import_export/exportProfileObject').entity,
		selectExportTarget: require('./entities/import_export/selectExportTarget').entity,
		importTool: require('./entities/import_export/importTool').entity,
		importSession: require('./entities/import_export/importSession').entity,
		importSessionType: require('./entities/import_export/importSessionType').entity,
		personalizationManagement: require('./entities/indus/personalizationManagement').entity,
		resourcePack: require('./entities/indus/resourcePack').entity,
		resourcePackItem: require('./entities/indus/resourcePackItem').entity,
		exportPersonalization: require('./entities/indus/exportPersonalization').entity,
		selectPMScheduler: require('./entities/indus/selectPMScheduler').entity,
		searchAdmin: require('./entities/searchAdmin').entity,
		x3ClassAction: require('./entities/introspection/x3Task/x3ClassAction').entity,
		x3ClassActionParam: require('./entities/introspection/x3Task/x3ClassActionParam').entity,
		x3ClassActionDateParam: require('./entities/introspection/x3Task/x3ClassActionDateParam').entity,
		x3Task: require('./entities/introspection/x3Task/x3Task').entity,

		sessionInfo: require('./entities/sessionInfo').entity,
		cvgSession: require('./entities/cvgSession').entity,
		cvgReuseClient: require('./entities/cvgReuseClient').entity,
		cvgRecord: require('./entities/cvgRecord').entity,
		moduleVersion: require('./entities/moduleVersion').entity,
		entityAttribute: require('./entities/import_export/entityAttribute').entity,
		executeMongoOrder: require('./entities/indus/executeMongoOrder').entity,
		// authoring
		configuration: require('./entities/page/configuration').entity,
		portlet: require('./entities/page/portlet').entity,
		vignetteRegroup: require('./entities/page/vignetteRegroup').entity,
		navigationPage: require('./entities/page/navigationPage').entity,
		landingPage: require('./entities/page/landingPage').entity,
		landingPageVignette: require('./entities/page/landingPageVignette').entity,
		landingVignetteSelect: require('./entities/page/landingVignetteSelect').entity,
		menuModule: require('./entities/page/menuModule').entity,
		menuBlock: require('./entities/page/menuBlock').entity,
		menuSubblock: require('./entities/page/menuSubblock').entity,
		menuItem: require('./entities/page/menuItem').entity,
		menuItemParameter: require('./entities/page/menuItemParameter').entity,
		menuCategory: require('./entities/page/menuCategory').entity,
		page: require('./entities/page/page').entity,
		pageData: require('./entities/page/pageData').entity,
		dashboardDef: require('./entities/page/dashboardDef').entity,
		dashboardVariant: require('./entities/page/dashboardVariant').entity,
		dashboardVignette: require('./entities/page/dashboardVignette').entity,
		dashboardAuth: require('./entities/page/dashboardAuth').entity,
		pageDef: require('./entities/page/pageDef').entity,
		pageVariant: require('./entities/page/pageVariant').entity,
		pageAuth: require('./entities/page/pageAuth').entity,
		fusionPageDefConvert: require('./entities/page/fusionPageDefConvert').entity,
		authoringSaveParam: require('./entities/page/authoringSaveParam').entity,
		profileMenuImport: require('./entities/page/profileMenuImport').entity,
		pageLayout: require('./entities/page/pageLayout').entity,
		pageLayoutProxy: require('./entities/page/pageLayoutProxy').entity,
		// manage theme custumization
		cssFile: require('./entities/page/css/cssFile').entity,
		theme: require('./entities/page/css/theme').entity,
		// storage area
		team: require('./entities/storage/team').entity,
		document: require('./entities/storage/document').entity,
		printDocument: require('./entities/storage/printDocument').entity,
		storageVolume: require('./entities/storage/storageVolume').entity,
		storageVolumeItem: require('./entities/storage/storageVolumeItem').entity,
		storageVolumeQuery: require('./entities/storage/storageVolumeQuery').entity,
		uploadVolumeItem: require('./entities/storage/uploadVolumeItem').entity,
		documentTag: require('./entities/storage/documentTag').entity,
		documentTagCategory: require('./entities/storage/documentTagCategory').entity,
		v6DocumentProxy: require('./entities/storage/v6DocumentProxy').entity,
		// lookups
		selectEndpoint: require('./entities/selectEndpoint').entity,
		lookupLocale: require('./entities/lookupLocale').entity,
		lookupX3Folder: require('./entities/lookupX3Folder').entity,
		lookupEntity: require('./entities/lookupEntity').entity,
		lookupEntityAttr: require('./entities/lookupEntityAttr').entity,
		lookupRepresentation: require('./entities/lookupRepresentation').entity,

		lookupTemplatePurposes: require('./entities/msoffice/lookupTemplatePurposes').entity,

		representationProxy: require('./entities/introspection/representationProxy').entity,
		entityProxy: require('./entities/introspection/entityProxy').entity,
		perftest: require('./entities/perftest').entity,
		// basic scheduler
		automate: require('./entities/scheduler/automate').entity,
		automateEvent: require('./entities/scheduler/automateEvent').entity,
		automateTask: require('./entities/scheduler/automateTask').entity,
		serverLog: require('./entities/serverLog').entity,
		serverLogEntry: require('./entities/serverLogEntry').entity,
		selectScheduler: require('./entities/scheduler/selectScheduler').entity,
		eventTime: require('./entities/scheduler/eventTime').entity,
		objectActionsRunner: require('./entities/scheduler/objectActionsRunner').entity,
		// excel
		excelBrowseDatasource: require('./entities/msoffice/excelBrowseDatasource').entity,
		excelOrderAttr: require('./entities/msoffice/excelOrderAttr').entity,

		// Excel template stuff
		msoExcelReportMode: require('./entities/msoffice/msoExcelReportMode').entity,
		msoExcelTemplateDocument: require('./entities/msoffice/msoExcelTemplateDocument').entity,

		// history
		navHistory: require('./entities/navHistory').entity,
		// word
		msoMailMergeDocSel: require('./entities/msoffice/msoMailMergeDocSel').entity,
		msoReportMode: require('./entities/msoffice/msoReportMode').entity,
		msoTestEntity: require('./entities/msoffice/msoTestEntity').entity,
		msoWordTemplateDocument: require('./entities/msoffice/msoWordTemplateDocument').entity,

		systemInfo: require('./entities/systemInfo').entity,

		// Rest Configs
		restWebService: require('./entities/rest/restWebService').entity,
		restHeader: require('./entities/rest/restHeader').entity,
		restParameter: require('./entities/rest/restParameter').entity,

		// Http Proxy
		proxyConfiguration: require('./entities/proxyConfiguration').entity,
		proxyConfigurationExclude: require('./entities/proxyConfigurationExclude').entity,

		// Business Objects
		boServer: require('./entities/bo/boServer').entity,
		boProfile: require('./entities/bo/boProfile').entity,

		// Async job
		asyncOperation: require('./entities/asyncOperation').entity,

		// Security
		securityProfile: require('./entities/securityProfile').entity,
		securityProfileItem: require('./entities/securityProfileItem').entity,

		x3SessionConfig: require('./entities/x3SessionConfig').entity,


		clientLog: require('./entities/clientLog').entity,


		copyright: require('./entities/copyright').entity,

		filterTest: require('./entities/filterTest').entity,

		update: require('./entities/update').entity,
		updatePatch: require('./entities/updatePatch').entity,
		epToUpdate: require('./entities/epToUpdate').entity,
		folderToUpdate: require('./entities/folderToUpdate').entity,
		copyright: require('./entities/copyright').entity,

		connectedApplication: require('./entities/connectedApplication').entity,
		tokenPayload: require('./entities/connectedApplication').entityPayload,
		tokenInfo: require('./entities/tokenInfo').entity,
	},
	representations: {
		// representation name here, not entity name (but might be the same as the entity name)
		user: require('./representations/user').representation,
		userMob: require('./representations/userMob').representation,
		role: require('./representations/role').representation,
		roleMob: require('./representations/roleMob').representation,
		endPoint: require('./representations/endPoint').representation,
		group: require('./representations/group').representation,
		groupMob: require('./representations/groupMob').representation,
		badge: require('./representations/badge').representation,
		team: require('./representations/team').representation,
		storageVolumeQuery: require('./representations/storageVolumeQuery').representation,
		portlet: require('./representations/portlet').representation,
		vignetteRegroup: require('./representations/vignetteRegroup').representation,
		ldap: require('./representations/ldap').representation,
		//
		certificate: require('./representations/certificate').representation,
		caCertificate: require('./representations/caCertificate').representation,
		landingPageReduced: require('./representations/page/landingPageReduced').representation,
		menuModulePage: require('./representations/page/menuModulePage').representation,
		menuBlockPage: require('./representations/page/menuBlockPage').representation,
		menuItem: require('./representations/menuItem').representation,
		dashboardDef: require('./representations/dashboardDef').representation,
		pageDef: require('./representations/pageDef').representation,
		authoringSaveParam: require('./representations/authoringSaveParam').representation,
		profileMenuImport: require('./representations/page/profileMenuImport').representation,
		documentExcel: require('./representations/msoffice/documentExcel').representation,
		excelBrowseDsEntity: require('./representations/msoffice/excelBrowseDsEntity').representation,
		excelBrowseDsMenuItem: require('./representations/msoffice/excelBrowseDsMenuItem').representation,
		//
		userProfileMob: require('./representations/userProfileMob').representation,
		license: require('./representations/license').representation,
		stackTranslation: require('./representations/stackTranslation').representation,
		host: require('./representations/host').representation,
		setting: require('./representations/setting').representation,
		automate: require('./representations/automate').representation,

		importTool: require('./representations/importTool').representation,
		x3UserImport: require('./representations/x3UserImport').representation,
		x3Task: require('./representations/introspection/x3Task').representation,
		searchAdmin: require('./representations/searchAdmin').representation,
		personalizationManagement: require('./representations/personalizationManagement').representation,

		uploadVolumeItem: require('./representations/uploadVolumeItem').representation,

		msoMailMergeDocSel: require('./representations/msoffice/msoMailMergeDocSel').representation,
		msoWordDocument: require('./representations/msoffice/msoWordDocument').representation,
		msoMailMergeTemplate: require('./representations/msoffice/msoMailMergeTemplate').representation,
		msoReportTemplate: require('./representations/msoffice/msoReportTemplate').representation,
		msoReportMode: require('./representations/msoffice/msoReportMode').representation,
		msoExcelReportMode: require('./representations/msoffice/msoExcelReportMode').representation,
		msoPptDocument: require('./representations/msoffice/msoPptDocument').representation,
		//msoWordTemplateDocument: require('./representations/msoffice/msoWordTemplateDocument').representation,
		msoExcelDocument: require('./representations/msoffice/msoExcelDocument').representation,
		msoExcelReportTemplate: require('./representations/msoffice/msoExcelReportTemplate').representation,
		msoExcelTemplateDocument: require('./representations/msoffice/msoExcelTemplateDocument').representation,

		//exportProfile: require('./representations/exportProfile').representation,
		document: require('./representations/storage/document').representation,
		systemInfo: require('./representations/systemInfo').representation,

		filterTest: require('./representations/filterTest').representation,
		x3SessionConfig: require('./representations/x3SessionConfig').representation,
		serverLog: require('./representations/serverLog').representation,
		//
		sessionInfo: require('./representations/sessionInfo').representation,
		cvgSession: require('./representations/cvgSession').representation,
		update: require('./representations/update').representation,

		connectedApplication: require('./representations/connectedApplication').representation,
		tokenInfo: require('./representations/tokenInfo').representation,

	},
	searchFacets: {
		group: {
			$title: "Groups",
			$lookup: {
				$entity: "group",
				$keyField: "description"
			},
			$fields: {
				user: "groups",
				group: "description"
			}
		},
		role: {
			$title: "Roles",
			$lookup: {
				$entity: "role",
				$keyField: "description"
			},
			$fields: {
				group: "role",
				role: "description"
			}
		},
		menuCategory: {
			$title: "Categories",
			$fields: {
				portlet: "categories",
				menuItem: "categories"
			}
		},
		menuModule: {
			$title: "Modules",
			$fields: {
				portlet: "module",
				menuItem: "module"
			}
		},
		endpoint: {
			$title: "Endpoints",
			$fields: {
				application: "endpoints",
				endPoint: "descriptions",
				group: "endPoints",
				portlet: "endpoint",
				//x3server: "endpoints"
				x3solution: "endpoints"
			}
		},
		documentTags: {
			$title: "Document tags",
			$fields: {
				documentTag: "description",
				document: "tags"
			}
		}
	},
	dbMeta: {
		initScript: ["syracuse-admin-init.json"],
		//automaticImport: ["syracuse-admin-templates.json", "x3-init.json", "hrm-init.json", "x3-global-modules.json", "x3-erp-menus.json", "x3-global-sitemap.json", "x3-erp-homepages.json", "x3-pages.json", "x3-mobile-dashboards.json", "x3-hrm-menus.json", "syracuse-sky-init.json"],
		//		automaticImport: ["syracuse-admin-templates.json", "x3-init.json", "x3-global-modules.json"],
		automaticImport: [
			"syracuse-admin-templates.json",
			"syracuse-admin-categories.json",
			"syracuse-security-init.json",
			"syracuse-collaboration-init.json",
			"x3-erp-init.json",
			"x3-hrm-init.json",
			"x3-geode-init.json",
			"x3-erp-menus.json",
			"x3-hrm-menus.json",
			"x3-geode-menus.json", {
				import: "syracuse-collaboration-sitemap.json",
				//				preScript: "../../collaboration/advancedScripts/pre-syracuse-collaboration-sitemap",
				//				postScript: "../../collaboration/advancedScripts/post-syracuse-collaboration-sitemap"
			}, {
				import: "x3-erp-sitemap.json",
				//				preScript: "../../collaboration/advancedScripts/pre-x3-erp-sitemap",
				//				postScript: "../../collaboration/advancedScripts/post-x3-erp-sitemap"
			}, {
				import: "x3-hrm-sitemap.json",
				//				preScript: "../../collaboration/advancedScripts/pre-x3-hrm-sitemap",
				//				postScript: "../../collaboration/advancedScripts/post-x3-hrm-sitemap"
			}, {
				import: "x3-geode-sitemap.json"
			},
			"x3-erp-homepages.json",
			"x3-pages.json",
			"x3-mobile-dashboards.json",
			"x3-mobile-applications.json",
			"syracuse-sky-init.json",
			"syracuse-admin-generic-ws.json",
			"syracuse-admin-notif-theme.json"
		],
		updateScript: [{
			script: "../../collaboration/updateScripts/updateScript_7P2",
			version: 2
		}, {
			script: "../../collaboration/updateScripts/updateScript",
			version: 63
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P3",
			version: 9
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P4",
			version: 7
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P6",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_101353_factory_metadata",
			version: 9
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P7",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P9",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P13",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_sky",
			version: 6
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_101353_info_metadata",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_88106_3",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Akira-P0",
			version: 5
		}, {
			script: "../../collaboration/updateScripts/updateScript_Akira-P1",
			version: 6
		}, {
			script: "../../collaboration/updateScripts/updateScript_Ambassador-P0",
			version: 6
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_107803_multi_process_server_management",
			version: 3
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_111144",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Ambassador-P3",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Avenger-P0",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P13",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_F_115599_iddn",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Avenger-P1",
			version: 2
		}, {
			script: "../../collaboration/updateScripts/updateScript_U11_P0",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Avenger-P2",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Akira-P7",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Ambassador-P4",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_Ambassador-P5",
			version: 1
		}, {
			script: "../../collaboration/updateScripts/updateScript_7P14",
			version: 1
		}]
	}
};

registry.extendContract(exports.contract);