// Dummy test entity
exports.entity = {
    $titleTemplate: "{huhu}",
    $valueTemplate: "{huhu}1",
   	$properties: {
		p1: {
			$title: "Prop1"
		},
		p2: {
			$title: "Prop2",
			$enum: [{
				$title: "T2",
				$value: "t_two"
			}, {
				$title: "T1",
				$value: "t_one"
			}, {
				$title: "T3",
				$value: "t_three"
			}]
        },
        p4: {
            $title: "Prop4"
        }
    }
}
