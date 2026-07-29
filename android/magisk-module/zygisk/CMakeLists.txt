cmake_minimum_required(VERSION 3.22)
project(kyc_virtcam_zygisk)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(kyc_virtcam_zygisk SHARED
  src/frame_ring.cpp
  src/module.cpp
)

target_include_directories(kyc_virtcam_zygisk PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/include
  ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_options(kyc_virtcam_zygisk PRIVATE
  -fno-exceptions
  -fno-rtti
  -fvisibility=hidden
  -Wall
  -Wextra
)

find_library(log-lib log)
find_library(mediandk-lib mediandk)

target_link_libraries(kyc_virtcam_zygisk
  ${log-lib}
  ${mediandk-lib}
  dl
)

set_target_properties(kyc_virtcam_zygisk PROPERTIES
  OUTPUT_NAME "arm64-v8a"
  PREFIX ""
  SUFFIX ".so"
)
