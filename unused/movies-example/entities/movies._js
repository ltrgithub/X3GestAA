module.exports = { 
	$title: "Movies",
	$properties: {
		title: {
			$title: "Title",
			$type: "application/x-string",
			$links: {
				$details: {
					$url: "/data/movies/{$uuid}?representation=movies.$details",
				},
			}
		},
		director: {
			$title: "Director",
			$type: "application/x-reference",
			$$basic: false,
			$item: {
				$$targetEntity: "persons",
				$url: "/data/persons/{$uuid}?representation=persons.$thumb",
				$shortUrl: "/data/persons/{$uuid}",
				$value: "{lastName}",
				$key: "{$uuid}",
				$description: "The person who directed the movie",
				$properties: {
					firstName: {
						$type: "application/x-string"
					},
					lastName: {
						$type: "application/x-string"
					},
				},
				$prototype: "/page?representation=persons.$thumb",
				$links: {
					$lookup: {
						$type: "application/json",
						$title: "Select the director",
						$url: "/data/persons?representation=persons.$lookup",
					},
					$details: {
						$type: "application/json",
						$url: "/data/persons/{$uuid}?representation=persons.$details",
					},
				}
			}
		},
		year: {
			$title: "Year",
			$type: "application/x-integer",
			$format: "0000"
		},
		plot: {
			$title: "Plot",
			$type: "application/x-document",
			$url: "/documents/plot-{$uuid}",
		},
	},
}