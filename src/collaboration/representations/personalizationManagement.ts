"use strict";

exports.representation = {
	$entityName: "personalizationManagement",
	$facets: {
		$details: {
			$layout: {
				$items: [{
					$category: "section",
					$title: "Informations",
					$layout: {
						$items: [{
							$bind: "code"
						}, {
							$bind: "description"
						}, {
							$bind: "locales"
						}]
					}
				}, {
					$category: "section",
					$title: "Dashboards",
					$layout: {
						$items: [{
							$bind: "dashboardsExport"
						}, {
							$bind: "dashboardFilter"
						}, {
							$bind: "dashboardVignetteFilter"
						}, {
							$bind: "dashboardInnerJoin"
						}]
					}
				}, {
					$category: "section",
					$title: "Pages",
					$layout: {
						$items: [{
							$bind: "pagesExport"
						}, {
							$bind: "pageFilter"
						}, {
							$bind: "pageVignetteFilter"
						}, {
							$bind: "pageInnerJoin"
						}]
					}
				}, {
					$category: "section",
					$title: "Navigation pages",
					$layout: {
						$items: [{
							$bind: "navPagesExport"
						}, {
							$bind: "navPageFilter"
						}, {
							$bind: "navPageModulesFilter"
						}, {
							$bind: "navPageSubmodulesFilter"
						}, {
							$bind: "navPageInnerJoin"
						}, {
							$bind: "navPageCleanupScript"
						}, {
							$bind: "navPageFactoryOwner"
						}]
					}
				}, {
					$category: "section",
					$title: "Home pages",
					$layout: {
						$items: [{
							$bind: "homepagesExport"
						}, {
							$bind: "homepageFilter"
						}]
					}
				}, {
					$category: "section",
					$title: "Menus",
					$layout: {
						$items: [{
							$bind: "menusExport"
						}, {
							$bind: "menuFilter"
						}]
					}
				}]
			}
		},
		$edit: {
			$layout: {
				$items: [{
					$category: "section",
					$title: "Informations",
					$layout: {
						$items: [{
							$bind: "code"
						}, {
							$bind: "description"
						}, {
							$bind: "locales"
						}]
					}
				}, {
					$category: "section",
					$title: "Dashboards",
					$layout: {
						$items: [{
							$bind: "dashboardsExport"
						}, {
							$layoutType: "row",
							$widths: "50,50",
							$items: [{
								$bind: "dashboardFilter"
							}, {
								$bind: "dashboardVignetteFilter"
							}]
						}, {
							$bind: "dashboardInnerJoin"
						}]
					}
				}, {
					$category: "section",
					$title: "Pages",
					$layout: {
						$items: [{
							$bind: "pagesExport"
						}, {
							$layoutType: "row",
							$widths: "50,50",
							$items: [{
								$bind: "pageFilter"
							}, {
								$bind: "pageVignetteFilter"
							}]
						}, {
							$bind: "pageInnerJoin"
						}]
					}
				}, {
					$category: "section",
					$title: "Navigation pages",
					$layout: {
						$items: [{
							$bind: "navPagesExport"
						}, {
							$layoutType: "row",
							$widths: "75,75,75",
							$items: [{
								$bind: "navPageFilter"
							}, {
								$bind: "navPageModulesFilter"
							}, {
								$bind: "navPageSubmodulesFilter"
							}]
						}, {
							$bind: "navPageInnerJoin"
						}, {
							$bind: "navPageCleanupScript"
						}, {
							$bind: "navPageFactoryOwner"
						}]
					}
				}, {
					$category: "section",
					$title: "Home pages",
					$layout: {
						$items: [{
							$bind: "homepagesExport"
						}, {
							$bind: "homepageFilter"
						}]
					}
				}, {
					$category: "section",
					$title: "Menus",
					$layout: {
						$items: [{
							$bind: "menusExport"
						}, {
							$bind: "menuFilter"
						}]
					}
				}]
			}
		}
	}
};