namespace Iamdee {
  export interface NodeCreatedCallback {
    (el: Element): void;
  }

  export interface Config {
    baseUrl?: string;
    onNodeCreated?: NodeCreatedCallback;
  }

  export interface RequireCallback {
    (...args: any[]): void;
  }

  export interface DefineFactoryFunction {
    (...args: any[]): unknown;
  }

  export type DefineFactory = DefineFactoryFunction | object;

  export interface RequireFunction {
    (dependencyId: string): unknown;
    (
      dependencyIds: string[],
      onSuccess: RequireCallback,
      onError?: (error: Error) => void
    ): void;
    (
      dependencyIds: string[],
      onSuccess?: RequireCallback,
      onError?: (error: Error) => void
    ): unknown;
    config: (config: Config) => void;
  }

  export type AnonymousDefineWithDependenciesArgs = [string[], DefineFactory];

  export type AnonymousDefineWithoutDependenciesArgs = [DefineFactory];

  export type AnonymousDefineArgs =
    | AnonymousDefineWithDependenciesArgs
    | AnonymousDefineWithoutDependenciesArgs;

  export type NamedDefineWithDependenciesArgs = [
    string,
    string[],
    DefineFactory
  ];

  export type NamedDefineWithoutDependenciesArgs = [string, DefineFactory];

  export type NamedDefineArgs =
    | NamedDefineWithDependenciesArgs
    | NamedDefineWithoutDependenciesArgs;

  export type DefineArgs = AnonymousDefineArgs | NamedDefineArgs;

  export interface DefineFunction {
    (factory: DefineFactory): void;
    (dependencies: string[], factory: DefineFactory): void;
    (id: string, dependencies: string[], factory: DefineFactory): void;
    (id: string, factory: DefineFactory): void;
    <T extends DefineArgs>(...args: T): void;
    amd: {};
  }
}

interface Window {
  define: Iamdee.DefineFunction;
  require: Iamdee.RequireFunction;
  requirejs: Iamdee.RequireFunction;
}

/** @define {boolean} */
const IAMDEE_PRODUCTION_BUILD = false;

/** @define {boolean} */
const IAMDEE_MODERN_BROWSER = false;

(function(undefined) {
  interface RequiredScript extends HTMLScriptElement {
    require: ModuleId;
  }

  const enum ModuleState {
    DEFINED = 0,
    NETWORK_LOADING = 1,
    WAITING_FOR_DEPENDENCIES = 2,
    INITIALIZED = 3,
    ERROR = 4
  }

  type ModuleId =
    | string & { readonly __tag: unique symbol }
    | "require"
    | "exports"
    | "module";
  type ModulePath = string & { readonly __tag: unique symbol };
  type SourceUrl = string & { readonly __tag: unique symbol };
  type RequestId = number & { readonly __tag: unique symbol };

  interface ModuleCallback {
    (module: Module): void;
  }

  interface DefinedModule {
    requestId?: RequestId;
    moduleState: ModuleState.DEFINED;
    forceInit: (requestId: RequestId) => void;
    callbacks: ModuleCallback[];
  }

  interface NetworkLoadingModule {
    requestId: RequestId;
    moduleState: ModuleState.NETWORK_LOADING;
    callbacks: ModuleCallback[];
  }

  interface WaitingForDependenciesModule {
    requestId: RequestId;
    moduleState: ModuleState.WAITING_FOR_DEPENDENCIES;
    callbacks: ModuleCallback[];
    exports: {};
  }

  interface InitializedModule {
    moduleState: ModuleState.INITIALIZED;
    exports: unknown;
  }

  interface ErrorModule {
    moduleState: ModuleState.ERROR;
    moduleError: Error;
  }

  type Module =
    | DefinedModule
    | NetworkLoadingModule
    | WaitingForDependenciesModule
    | InitializedModule
    | ErrorModule;

  const moduleMap: { [key: string]: Module } = Object.create(null);
  function noop() {}

  function panic(message: string) {
    if (!IAMDEE_PRODUCTION_BUILD) {
      throw Error(message);
    }
  }

  let baseUrl = "./";
  let onNodeCreated: Iamdee.NodeCreatedCallback = noop;

  function isAnonymousDefine(
    args: Iamdee.DefineArgs
  ): args is Iamdee.AnonymousDefineArgs {
    return typeof args[0] != "string";
  }

  function isAnonymousDefineWithDependencies(
    args: Iamdee.AnonymousDefineArgs
  ): args is Iamdee.AnonymousDefineWithDependenciesArgs {
    return Array.isArray(args[0]);
  }

  function isNamedDefineWithDependencies(
    args: Iamdee.NamedDefineArgs
  ): args is Iamdee.NamedDefineWithDependenciesArgs {
    return Array.isArray(args[1]);
  }

  function config(conf: Iamdee.Config) {
    baseUrl = conf["baseUrl"] || baseUrl;
    onNodeCreated = conf["onNodeCreated"] || onNodeCreated;
  }

  function resolveModule(
    id: ModuleId,
    module: InitializedModule | ErrorModule
  ) {
    const currentModule = moduleMap[id];
    if (!currentModule) {
      return panic("Trying to resolve non-existing module");
    }
    if (
      currentModule.moduleState == ModuleState.INITIALIZED ||
      currentModule.moduleState == ModuleState.ERROR
    ) {
      return panic(
        "Can not double resolve module " + currentModule.moduleState
      );
    }
    // This makes sure script errors are reported
    // to console and any custom onerror handlers
    if (module.moduleState == ModuleState.ERROR) {
      setTimeout(function() {
        throw module.moduleError;
      });
    }
    moduleMap[id] = module;
    currentModule.callbacks.map(function(cb) {
      cb(module);
    });
  }

  function isModuleId(value: any): value is ModuleId {
    return typeof value === "string";
  }

  function request(
    id: ModuleId,
    requestId: RequestId,
    callback: ModuleCallback
  ) {
    const module = moduleMap[id];
    if (!module) {
      const src = /^\/|^\w+:|\.js$/.test(id) ? id : baseUrl + id + ".js";
      moduleMap[id] = loadModule(id, src as SourceUrl, requestId, callback);
    } else {
      if (
        module.moduleState == ModuleState.INITIALIZED ||
        module.moduleState == ModuleState.ERROR
      ) {
        callback(module);
      } else if (module.moduleState == ModuleState.NETWORK_LOADING) {
        module.callbacks.push(callback);
      } else if (module.moduleState == ModuleState.DEFINED) {
        module.callbacks.push(callback);
        module.forceInit(requestId);
      } else if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
        // Circular dependency
        if (module.requestId == requestId) {
          callback(module);
        } else {
          module.callbacks.push(callback);
        }
      }
    }
  }

  function createRequire(moduleId: ModuleId, requestId?: RequestId) {
    const baseId = moduleId.replace(/[^/]+$/, "");

    function modulePathToId(path: ModulePath): ModuleId {
      let temp: string = path;
      let result: string = path;
      if (result[0] == ".") {
        result = baseId + result;
        while (result != temp) {
          temp = result;
          // Turns /./ and // into /
          result = result.replace(/\/\.?\//, "/");
          // Turns foo/bar/../buzz into foo/buzz
          result = result.replace(/[^/]+\/\.\.(\/|$)/, "");
        }
      }
      return result as ModuleId;
    }

    let nextRequestId = 1;

    const require = function(
      moduleIdOrDependencyPathList: ModuleId | ModulePath[],
      onSuccess?: Iamdee.RequireCallback,
      onError?: (error: Error) => unknown
    ) {
      if (isModuleId(moduleIdOrDependencyPathList)) {
        const module = moduleMap[moduleIdOrDependencyPathList];
        if (!module || module.moduleState !== ModuleState.INITIALIZED) {
          throw Error("#3 " + moduleIdOrDependencyPathList);
        }
        return module.exports;
      }
      const dependencyIds = moduleIdOrDependencyPathList.map(modulePathToId);
      let remainingDependencies = moduleIdOrDependencyPathList.length + 1;
      const rId = requestId || (nextRequestId++ as RequestId);

      function ensureCommonJsDependencies() {
        let cjsModule: { exports: unknown } = { exports: {} };
        const module = moduleMap[moduleId];
        if (module) {
          if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
            cjsModule = module;
          } else {
            panic("Unexpected module state");
          }
        }
        moduleMap["require"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: require
        };
        moduleMap["exports"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule.exports
        };
        moduleMap["module"] = {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule
        };
      }

      function dependencyReadyCallback() {
        if (--remainingDependencies == 0) {
          ensureCommonJsDependencies();
          try {
            const dependencies: unknown[] = dependencyIds.map(function(id) {
              const module = moduleMap[id];
              if (!module) {
                return panic(
                  "Mismatch in reported and actually loaded modules"
                );
              }
              if (
                module.moduleState == ModuleState.NETWORK_LOADING ||
                module.moduleState == ModuleState.DEFINED
              ) {
                return panic(
                  "Unexpected module state when resolving dependencies"
                );
              }
              if (module.moduleState == ModuleState.ERROR) {
                throw Error("#4 " + id);
              }
              return module.exports;
            });
            (onSuccess || noop).apply(undefined, dependencies);
          } catch (error) {
            (onError || noop)(error);
          }
        }
      }

      ensureCommonJsDependencies();
      dependencyIds.map(function(id) {
        request(id, rId, dependencyReadyCallback);
      });
      setTimeout(dependencyReadyCallback);
    } as Iamdee.RequireFunction;
    require["config"] = config;
    return require;
  }

  function loadModule(
    id: ModuleId,
    src: SourceUrl,
    requestId: RequestId,
    callback: ModuleCallback
  ): NetworkLoadingModule {
    // Adding new script to the browser. Since it is inserted
    // dynamically it will be "async" by default
    const el = document.createElement("script") as RequiredScript;
    el["require"] = id;
    el.src = src;
    onNodeCreated(el);

    el.onerror = function() {
      resolveModule(id, {
        moduleState: ModuleState.ERROR,
        moduleError: Error("#5 " + id)
      });
    };
    document.head.appendChild(el);
    return {
      requestId,
      moduleState: ModuleState.NETWORK_LOADING,
      callbacks: [callback]
    };
  }

  function doDefine(
    id: ModuleId,
    dependencies: string[],
    factory: Iamdee.DefineFactory
  ) {
    const existingModule = moduleMap[id];
    const definedModule: DefinedModule = {
      moduleState: ModuleState.DEFINED,
      callbacks: [],
      forceInit(requestId) {
        const waitingModule: WaitingForDependenciesModule = {
          requestId,
          moduleState: ModuleState.WAITING_FOR_DEPENDENCIES,
          callbacks: definedModule.callbacks,
          exports: {}
        };
        moduleMap[id] = waitingModule;
        const localRequire = createRequire(id, requestId);
        localRequire(
          dependencies,
          function() {
            const result =
              typeof factory == "function"
                ? factory.apply(undefined, arguments)
                : factory;
            const exports =
              result === undefined ? waitingModule.exports : result;
            resolveModule(id, {
              moduleState: ModuleState.INITIALIZED,
              exports
            });
          },
          function(error) {
            resolveModule(id, {
              moduleState: ModuleState.ERROR,
              moduleError: error
            });
          }
        );
      }
    };
    moduleMap[id] = definedModule;
    if (existingModule) {
      if (existingModule.moduleState != ModuleState.NETWORK_LOADING) {
        return panic("Trying to define a module that is in a wrong state");
      }
      definedModule.callbacks = existingModule.callbacks;
      definedModule.forceInit(existingModule.requestId);
    }
  }

  // This is a live node list, so we do not need to re-query
  const scripts = document.getElementsByTagName("script");

  function getCurrentScript() {
    let script = document["currentScript"];
    if (script) {
      return script as RequiredScript;
    }
    // Support for IE 9-11
    try {
      throw Error();
    } catch (err) {
      // Internet Explorer 11 does not support currentScript,
      // so we are inspecting error stack for the right script url
      const lastLine = err.stack ? err.stack.split("\n").pop() : "";
      for (let i = scripts.length - 1; i >= 0; --i) {
        script = scripts[i];
        if (script.src) {
          if (lastLine.indexOf(script.src) >= 0) {
            return script as RequiredScript;
          } else if ((script as any).readyState == "interactive") {
            return script as RequiredScript;
          }
        }
      }
    }
  }

  const define = function() {
    const args = (arguments as any) as Iamdee.DefineArgs;
    const script = IAMDEE_MODERN_BROWSER
      ? (document["currentScript"] as RequiredScript)
      : getCurrentScript();
    const expectedModuleId = script && script["require"];

    let dependencies = ["require", "exports", "module"];

    if (isAnonymousDefine(args)) {
      if (!expectedModuleId) {
        throw Error("#1");
      }
      if (isAnonymousDefineWithDependencies(args)) {
        doDefine(expectedModuleId, args[0], args[1]);
      } else {
        doDefine(expectedModuleId, dependencies, args[0]);
      }
    } else {
      const id = args[0] as ModuleId;
      if (expectedModuleId && expectedModuleId != id) {
        return resolveModule(id, {
          moduleState: ModuleState.ERROR,
          moduleError: Error("#2")
        });
      }
      if (isNamedDefineWithDependencies(args)) {
        doDefine(id, args[1], args[2]);
      } else {
        doDefine(id, dependencies, args[1]);
      }
    }
  } as Iamdee.DefineFunction;
  define["amd"] = {};

  window["define"] = define;
  window["requirejs"] = window["require"] = createRequire(
    "" as ModuleId,
    undefined
  );
})();
