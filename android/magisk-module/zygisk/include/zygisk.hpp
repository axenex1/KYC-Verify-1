// Magisk Zygisk module API (lab trim) — entry via zygisk_module_entry.
#pragma once

#include <cstdint>
#include <jni.h>

#define ZYGISK_API_VERSION 4

namespace zygisk {

enum Option : int {
  FORCE_DENYLIST_UNMOUNT = 0,
  DLCLOSE_MODULE_LIBRARY = 1,
};

struct AppSpecializeArgs {
  jint &uid;
  jint &gid;
  jintArray &gids;
  jint &runtime_flags;
  jobjectArray &rlimits;
  jint &mount_external;
  jstring &se_info;
  jstring &nice_name;
  jstring &instruction_set;
  jstring &app_data_dir;
  jboolean *const is_child_zygote;
  jboolean *const is_top_app;
  jobjectArray *const pkg_data_info_list;
  jobjectArray *const whitelisted_data_info_list;
  jboolean *const mount_data_dirs;
  jboolean *const mount_storage_dirs;
};

struct ServerSpecializeArgs {
  jint &uid;
  jint &gid;
  jintArray &gids;
  jint &runtime_flags;
  jlong &permitted_capabilities;
  jlong &effective_capabilities;
};

class ModuleBase {
 public:
  virtual void onLoad([[maybe_unused]] void *api,
                      [[maybe_unused]] JNIEnv *env) {}
  virtual void preAppSpecialize([[maybe_unused]] AppSpecializeArgs *args) {}
  virtual void postAppSpecialize(
      [[maybe_unused]] const AppSpecializeArgs *args) {}
  virtual void preServerSpecialize(
      [[maybe_unused]] ServerSpecializeArgs *args) {}
  virtual void postServerSpecialize(
      [[maybe_unused]] const ServerSpecializeArgs *args) {}
  virtual ~ModuleBase() = default;
};

namespace internal {

struct module_abi {
  long api_version;
  ModuleBase *impl;
  void (*preAppSpecialize)(ModuleBase *, AppSpecializeArgs *);
  void (*postAppSpecialize)(ModuleBase *, const AppSpecializeArgs *);
  void (*preServerSpecialize)(ModuleBase *, ServerSpecializeArgs *);
  void (*postServerSpecialize)(ModuleBase *, const ServerSpecializeArgs *);
};

struct api_table {
  void *this_fn;
  bool (*registerModule)(api_table *table, module_abi *module);
  void (*hookJniNativeMethods)(JNIEnv *, const char *, JNINativeMethod *, int);
  void (*pltHookRegister)(const char *, const char *, void *, void **);
  void (*pltHookExclude)(const char *, const char *);
  bool (*pltHookCommit)();
};

inline void preApp(ModuleBase *m, AppSpecializeArgs *a) {
  m->preAppSpecialize(a);
}
inline void postApp(ModuleBase *m, const AppSpecializeArgs *a) {
  m->postAppSpecialize(a);
}
inline void preServer(ModuleBase *m, ServerSpecializeArgs *a) {
  m->preServerSpecialize(a);
}
inline void postServer(ModuleBase *m, const ServerSpecializeArgs *a) {
  m->postServerSpecialize(a);
}

}  // namespace internal

}  // namespace zygisk

#define REGISTER_ZYGISK_MODULE(clazz)                                         \
  extern "C" [[gnu::visibility("default")]] void zygisk_module_entry(         \
      zygisk::internal::api_table *table, JNIEnv *env) {                      \
    if (!table || !table->registerModule) return;                             \
    static clazz module;                                                      \
    static zygisk::internal::module_abi abi = {                               \
        ZYGISK_API_VERSION,                                                   \
        &module,                                                              \
        zygisk::internal::preApp,                                             \
        zygisk::internal::postApp,                                            \
        zygisk::internal::preServer,                                          \
        zygisk::internal::postServer,                                         \
    };                                                                        \
    if (!table->registerModule(table, &abi)) return;                          \
    module.onLoad(table, env);                                                \
  }
