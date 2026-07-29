cmake_minimum_required(VERSION 3.22.1)
project(kyc_virtcam_shim)

add_library(kyc_virtcam_shim SHARED virtcam_shim.cpp)

find_library(log-lib log)
target_link_libraries(kyc_virtcam_shim ${log-lib})
