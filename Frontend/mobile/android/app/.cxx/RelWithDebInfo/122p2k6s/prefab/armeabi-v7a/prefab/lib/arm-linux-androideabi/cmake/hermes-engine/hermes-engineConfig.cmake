if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/sunilkumar/.gradle/caches/8.13/transforms/57a5e18766bdb2527cc87978307936cd/transformed/hermes-android-0.79.1-release/prefab/modules/libhermes/libs/android.armeabi-v7a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/sunilkumar/.gradle/caches/8.13/transforms/57a5e18766bdb2527cc87978307936cd/transformed/hermes-android-0.79.1-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

