module.exports = { 
	$title: "Person",
	$properties: {
		firstName: {
			$title: "First name",
			$type: "application/x-string"
		},
		lastName: {
			$title: "Last name",
			$type: "application/x-string"
		},
		dob: {
			$title: "Date of birth",
			$type: "application/x-date",
			$basic: false,
		},
	},
}