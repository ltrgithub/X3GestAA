"use strict";
exports.representation = {
	$entityName: "storageVolumeQuery",
	$facets: {
		$query: {
			$prototype: {
				$links: {
					$create: {
						$title: "Create global volume",
						$url: "{$baseUrl}/storageVolumes/$template/$workingCopies?representation=storageVolume.$edit",
						$method: "POST"
					},
					createEPVol: {
						$title: "Create endpoint volume",
						$url: "/sdata/{application}/{contract}/{dataset}/AVOLUME/$template/$workingCopies?representation=AVOLUME.$edit",
						$method: "POST",
						$parameters: {
							$url: "{$baseUrl}/selectEndpoints/$template/$workingCopies?representation=selectEndpoint.$edit",
							$method: "POST",
							$properties: {}
						}
					}
				}
			}
		}
	}
};