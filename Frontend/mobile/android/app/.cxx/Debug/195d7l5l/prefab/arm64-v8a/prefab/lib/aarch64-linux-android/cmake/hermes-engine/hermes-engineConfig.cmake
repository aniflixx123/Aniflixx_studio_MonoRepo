if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/sunilkumar/.gradle/caches/8.13/transforms/c1ca9c9a897c975ca4a67c88e5d8c1a7/transformed/hermes-android-0.79.1-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/sunilkumar/.gradle/caches/8.13/transforms/c1ca9c9a897c975ca4a67c88e5d8c1a7/transformed/hermes-android-0.79.1-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

