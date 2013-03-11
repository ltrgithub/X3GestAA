var x = {
    "$descriptor": "prototype OACV.$details",
    "$type": "application/json",
    "$url": "http://placeholder",
    "$title": "activity Codes CMI!!",
    "$properties": {
        "bA": {
            "$type": "application/x-array",
            "$title": "Activity code",
            "$item": {
                "$properties": {
                    "bA1": {
                        "$title": "Code",
                        "$type": "application/x-string"
                    },
                    "bA2": {
                        "$title": "Label",
                        "$type": "application/x-string"
                    },
                    "bA3": {
                        "$title": "Module",
                        "$type": "application/x-string"
                    },
                    "bA4": {
                        "$title": "Flag",
                        "$type": "application/x-string"
                    }
                }
            }
        },
        "bB": {
            "$type": "application/x-array",
            "$title": "Last read",
            "$item": {
                "$properties": {
                    "bB1": {
                        "$title": "Code",
                        "$type": "application/x-string"
                    },
                    "bB2": {
                        "$title": "Label",
                        "$type": "application/x-string"
                    },
                    "bB3": {
                        "$title": "Module",
                        "$type": "application/x-string"
                    },
                    "bB4": {
                        "$title": "Flag",
                        "$type": "application/x-string"
                    }
                }
            }
        },
        "AA1": {
            "$title": "Activity Code",
            "$type": "application/x-string"
        },
        "AA2": {
            "$title": "Description",
            "$type": "application/x-string"
        },
        "AB1": {
            "$title": "Active",
            "$type": "application/x-boolean"
        },
        "AB2": {
            "$title": "Module",
            "$type": "application/x-choice",
            "$format": "$combo",
            "$mnu": "14"
        },
        "AB3": {
            "$title": "Superviseur",
            "$type": "application/x-boolean"
        },
        "AB4": {
            "$title": "Activity Code",
            "$type": "application/x-string"
        },
        "AB5": {
            "$title": "Sequence",
            "$type": "application/x-string"
        },
        "AB6": {
            "$title": "Type",
            "$type": "application/x-choice",
            "$format": "$radios",
            "$mnu": "93"
        },
        "AB7": {
            "$title": "Minimum dimension",
            "$type": "application/x-string"
        },
        "AB8": {
            "$title": "Maximum dimension",
            "$type": "application/x-string"
        },
        "AB9": {
            "$title": "Screen dimension",
            "$type": "application/x-string"
        },
        "AB10": {
            "$title": "Deps.",
            "$type": "application/x-choice",
            "$format": "$radios",
            "$mnu": "74"
        },
        "AB11": {
            "$title": "Activity Code",
            "$type": "application/x-string"
        },
        "AB12": {
            "$title": "Formulas",
            "$type": "application/x-string"
        }
    },
    "$article": {
        "$layout": {
            "$layoutType": "row",
            "$layoutSubType": "25,75",
            "$items": [{
                "$category": "fusionBar",
                "$items": [{
                    "$bind": "bA",
                    "$format": "xflgrid",
                    "$isEditMode": false
                }, {
                    "$bind": "bB",
                    "$format": "xflgrid",
                    "$isEditMode": false
                }]
            }, {
                "$layoutType": "stack",
                "$items": [{
                    "$X3": "...",
                    "$XID": "065536",
                    "$category": "section",
                    "$layout": {
                        "$items": [{
                            "$X3": "...",
                            "$XID": "06553600256",
                            "$title": "Bloc 1",
                            "$category": "section",
                            "$layout": {
                                "$layoutType": "row",
                                "$items": [{
                                    "$isEditMode": true,
                                    "$bind": "AA1",
                                    "$X3": "..."
                                }, {
                                    "$isEditMode": true,
                                    "$bind": "AA2",
                                    "$X3": "..."
                                }]
                            }
                        }, {
                            "$X3": "...",
                            "$XID": "06553600512",
                            "$category": "section",
                            "$title": "Bloc 2",
                            "$layout": {
                                "$items": [{
                                    "$layoutType": "row",
                                    "$items": [{
                                        "$layoutType": "stack",
                                        "$items": [{
                                            "$isEditMode": true,
                                            "$bind": "AB1",
                                            "$X3": "..."
                                        }, {
                                            "$isEditMode": true,
                                            "$bind": "AB3",
                                            "$X3": "..."
                                        }]
                                    }, {
                                        "$layoutType": "stack",
                                        "$items": [{
                                            "$isEditMode": true,
                                            "$bind": "AB2",
                                            "$X3": "..."
                                        }, {
                                            "$isEditMode": true,
                                            "$bind": "AB4",
                                            "$X3": "..."
                                        }]
                                    }]
                                }, {
                                    "$layoutType": "stack",
                                    "$items": [{
                                        "$isEditMode": true,
                                        "$bind": "AB5",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB6",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB7",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB8",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB9",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB10",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB11",
                                        "$X3": "..."
                                    }, {
                                        "$isEditMode": true,
                                        "$bind": "AB12",
                                        "$X3": "..."
                                    }]
                                }]
                            }
                        }]
                    }
                }]
            }]
        },
        "$XID": 0
    },
    "$actions": {
        "aA1": {
            "$title": "Save",
            "$act": 1116
        },
        "aA2": {
            "$title": "Create",
            "$act": 1117
        },
        "aA3": {
            "$title": "Delete",
            "$act": 1118
        },
        "aA4": {
            "$title": "Cancel",
            "$act": 2816
        },
        "aA5": {
            "$title": "Copy",
            "$act": 2125
        },
        "aA6": {
            "$title": "End",
            "$act": 2845
        }
    }
}
