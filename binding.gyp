{
  "targets": [
    {
      "target_name": "naudiodon",
      "sources": [
        "src/naudiodonUtil.cc",
        "src/naudiodon.cc",
        "src/GetDevices.cc",
        "src/GetHostAPIs.cc",
      	"src/AudioIO.cc",
      	"src/PaContext.cc"
      ],
      "include_dirs": [
        "portaudio/include"
      ],
      "conditions" : [
        [
          'OS=="mac"', {
            'xcode_settings': {
              'GCC_ENABLE_CPP_RTTI': 'YES',
              'MACOSX_DEPLOYMENT_TARGET': '10.7',
              'OTHER_CPLUSPLUSFLAGS': [
                '-std=c++11',
                '-stdlib=libc++',
                '-fexceptions'
              ]
            },
            "link_settings": {
              "libraries": [
                "-Wl,-rpath,@loader_path"
              ]
            },
            "libraries": [
              "libportaudio.dylib"
            ],
            "copies": [
              {
                "destination": "build/Release/",
                "files": [
                  "<!@(ls -1 portaudio/bin/libportaudio.dylib)"
                ]
              }
            ]
          },
        ],
        [
          'OS=="win"', {
            "configurations": {
              "Release": {
                "msvs_settings": {
                  "VCCLCompilerTool": {
                    "RuntimeTypeInfo": "true",
                    "ExceptionHandling": 1
                  }
                }
              }
            },
            "libraries": [
               "-l../portaudio/bin/portaudio_x64.lib"
            ],
            "copies": [
              {
                "destination": "build/Release",
                "files": [
                  "portaudio/bin/portaudio_x64.dll"
                ]
              }
            ]
          },
        ],
        [
          'OS=="linux"', {
            "conditions": [
              # 32-bit ARM (armhf / Raspberry Pi): vendored prebuilt
              ['target_arch=="arm"', {
                "cflags_cc!": [
                  "-fno-rtti",
                  "-fno-exceptions"
                ],
                "cflags_cc": [
                  "-std=c++11",
                  "-fexceptions"
                ],
                "link_settings": {
                  "libraries": [
                    "<@(module_root_dir)/build/Release/libportaudio.so.2"
                  ],
                  "ldflags": [
                    "-L<@(module_root_dir)/build/Release",
                    "-Wl,-rpath,<@(module_root_dir)/build/Release"
                  ]
                },
                "copies": [
                  {
                    "destination": "build/Release/",
                    "files": [
                      "<@(module_root_dir)/portaudio/bin_armhf/libportaudio.so.2"
                    ]
                  }
                ]
              }],
              # aarch64 / linux-arm64: no vendored .so in-repo; link system PortAudio
              # (install libportaudio2 + portaudio19-dev). Same dependency model as
              # packaging/deb and packaging/docker.
              ['target_arch=="arm64"', {
                "cflags_cc!": [
                  "-fno-rtti",
                  "-fno-exceptions"
                ],
                "cflags_cc": [
                  "-std=c++11",
                  "-fexceptions"
                ],
                "link_settings": {
                  "libraries": [
                    "-lportaudio"
                  ]
                }
              }],
              # ia32 or x64: vendored prebuilt
              ['target_arch=="ia32" or target_arch=="x64"', {
                "cflags_cc!": [
                  "-fno-rtti",
                  "-fno-exceptions"
                ],
                "cflags_cc": [
                  "-std=c++11",
                  "-fexceptions"
                ],
                "link_settings": {
                  "libraries": [
                    "<@(module_root_dir)/build/Release/libportaudio.so.2"
                  ],
                  "ldflags": [
                    "-L<@(module_root_dir)/build/Release",
                    "-Wl,-rpath,<@(module_root_dir)/build/Release"
                  ]
                },
                "copies": [
                  {
                    "destination": "build/Release/",
                    "files": [
                      "<@(module_root_dir)/portaudio/bin/libportaudio.so.2"
                    ]
                  }
                ]
              }]
            ]
          }
        ]
      ]
    }
  ]
}
