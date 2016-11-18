{
  "targets": [
    {
      "target_name": "crypt",
      "sources": [ "cpp/crypt.cc" ],
      'conditions': [
        ['OS=="mac"',
          {
            'xcode_settings': {
              'OTHER_LDFLAGS': [
                '-framework CoreFoundation -framework IOKit'
              ]
            }
          }
        ]
      ]
    }
  ]
}