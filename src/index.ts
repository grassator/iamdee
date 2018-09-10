interface IamdeeNodeCreatedCallback {
  (el: Element): void;
}

interface IamdeeConfig {
  baseUrl?: string;
  onNodeCreated?: IamdeeNodeCreatedCallback;
}

interface IamdeeRequireCallback {
  (...args: any[]): void;
}

interface IamdeeDefineFactoryFunction {
  (...args: any[]): unknown;
}

type IamdeeDefineFactory = IamdeeDefineFactoryFunction | object;

interface IamdeeRequireFunction {
  (dependencyId: string): unknown;
  (
    dependencyIds: string[],
    onSuccess: IamdeeRequireCallback,
    onError?: (error: Error) => void
  ): void;
  (
    dependencyIds: string[],
    onSuccess?: IamdeeRequireCallback,
    onError?: (error: Error) => void
  ): unknown;
  config: (config: IamdeeConfig) => void;
}

type IamdeeAnonymousDefineWithDependenciesArgs = [
  string[],
  IamdeeDefineFactory
];

type IamdeeAnonymousDefineWithoutDependenciesArgs = [IamdeeDefineFactory];

type IamdeeAnonymousDefineArgs =
  | IamdeeAnonymousDefineWithDependenciesArgs
  | IamdeeAnonymousDefineWithoutDependenciesArgs;

type IamdeeNamedDefineWithDependenciesArgs = [
  string,
  string[],
  IamdeeDefineFactory
];

type IamdeeNamedDefineWithoutDependenciesArgs = [string, IamdeeDefineFactory];

type IamdeeNamedDefineArgs =
  | IamdeeNamedDefineWithDependenciesArgs
  | IamdeeNamedDefineWithoutDependenciesArgs;

type IamdeeDefineArgs = IamdeeAnonymousDefineArgs | IamdeeNamedDefineArgs;

interface IamdeeDefineFunction {
  (factory: IamdeeDefineFactory): void;
  (dependencies: string[], factory: IamdeeDefineFactory): void;
  (id: string, dependencies: string[], factory: IamdeeDefineFactory): void;
  (id: string, factory: IamdeeDefineFactory): void;
  <T extends IamdeeDefineArgs>(...args: T): void;
  amd: {};
}

interface Window {
  define: IamdeeDefineFunction;
  require: IamdeeRequireFunction;
  requirejs: IamdeeRequireFunction;
}

/** @define {boolean} */
const IAMDEE_PRODUCTION_BUILD = false;

(function(window, undefined) {
  interface RequiredScript extends HTMLScriptElement {
    require: ModuleId;
  }

  const hasOwnProperty = {}.hasOwnProperty;

  function get<TKey extends string, TValue>(
    map: { [key: string]: TValue },
    key: TKey
  ): TValue | undefined {
    if (hasOwnProperty.call(map, key)) {
      return map[key];
    }
  }
  function set<TKey extends string, TValue>(
    map: { [key: string]: TValue },
    key: TKey,
    value: TValue
  ): void {
    map[key] = value;
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

  const moduleMap: { [key: string]: Module } = {};
  function noop() {}

  function panic(message: string) {
    if (!IAMDEE_PRODUCTION_BUILD) {
      throw Error(message);
    }
  }

  const doc = document;
  let baseUrl = "./";
  let onNodeCreated: IamdeeNodeCreatedCallback = noop;

  function isAnonymousDefine(
    args: IamdeeDefineArgs
  ): args is IamdeeAnonymousDefineArgs {
    return typeof args[0] != "string";
  }

  function isAnonymousDefineWithDependencies(
    args: IamdeeAnonymousDefineArgs
  ): args is IamdeeAnonymousDefineWithDependenciesArgs {
    return Array.isArray(args[0]);
  }

  function isNamedDefineWithDependencies(
    args: IamdeeNamedDefineArgs
  ): args is IamdeeNamedDefineWithDependenciesArgs {
    return Array.isArray(args[1]);
  }

  function config(conf: IamdeeConfig) {
    baseUrl = conf["baseUrl"] || baseUrl;
    onNodeCreated = conf["onNodeCreated"] || onNodeCreated;
  }

  function resolveModule(
    id: ModuleId,
    module: InitializedModule | ErrorModule
  ) {
    const currentModule = get(moduleMap, id);
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
    set(moduleMap, id, module);
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
    const module = get(moduleMap, id);
    if (!module) {
      const src = /^\/|^\w+:|\.js$/.test(id) ? id : baseUrl + id + ".js";
      const module = loadModule(id, src as SourceUrl, requestId, callback);
      set(moduleMap, id, module);
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
      onSuccess?: IamdeeRequireCallback,
      onError?: (error: Error) => unknown
    ) {
      if (isModuleId(moduleIdOrDependencyPathList)) {
        const module = get(moduleMap, moduleIdOrDependencyPathList);
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
        const module = get(moduleMap, moduleId);
        if (module) {
          if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
            cjsModule = module;
          } else {
            panic("Unexpected module state");
          }
        }
        set(moduleMap, "require", {
          moduleState: ModuleState.INITIALIZED,
          exports: require
        });
        set(moduleMap, "exports", {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule.exports
        });
        set(moduleMap, "module", {
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule
        });
      }

      function dependencyReadyCallback() {
        if (--remainingDependencies == 0) {
          ensureCommonJsDependencies();
          try {
            const dependencies: unknown[] = dependencyIds.map(function(id) {
              const module = get(moduleMap, id);
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
    } as IamdeeRequireFunction;
    require["config"] = config;
    return require;
  }

  function loadModule(
    id: ModuleId,
    src: SourceUrl,
    requestId: RequestId,
    callback: ModuleCallback
  ): NetworkLoadingModule {
    // need to add new script to the browser
    const el = doc.createElement("script") as RequiredScript;
    el["require"] = id;
    el.src = src;
    onNodeCreated(el);

    el.onerror = function(errorEvent) {
      const error: Error = Error(errorEvent["message"]);
      error["stack"] =
        "Error: " +
        errorEvent["message"] +
        "\n    at " +
        errorEvent["filename"] +
        ":" +
        errorEvent["lineno"] +
        ":" +
        errorEvent["colno"];
      resolveModule(id, { moduleState: ModuleState.ERROR, moduleError: error });
    };
    doc.head.appendChild(el);
    return {
      requestId,
      moduleState: ModuleState.NETWORK_LOADING,
      callbacks: [callback]
    };
  }

  function doDefine(
    id: ModuleId,
    dependencies: string[],
    factory: IamdeeDefineFactoryFunction
  ) {
    const existingModule = get(moduleMap, id);
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
        set(moduleMap, id, waitingModule);
        const localRequire = createRequire(id, requestId);
        localRequire(
          dependencies,
          function() {
            const result = factory.apply(undefined, arguments);
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
    set(moduleMap, id, definedModule);
    if (existingModule) {
      if (existingModule.moduleState != ModuleState.NETWORK_LOADING) {
        return panic("Trying to define a module that is in a wrong state");
      }
      definedModule.callbacks = existingModule.callbacks;
      definedModule.forceInit(existingModule.requestId);
    }
  }

  // This is a live node list, so we do not need to re-query
  const scripts = doc.getElementsByTagName("script");

  function getCurrentScript() {
    let script = doc["currentScript"];
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
    const args = (arguments as any) as IamdeeDefineArgs;
    const script = getCurrentScript();
    const expectedModuleId = script && script["require"];

    let id: ModuleId;
    let dependencies = ["require", "exports", "module"];
    let factory: IamdeeDefineFactory = noop;

    if (isAnonymousDefine(args)) {
      if (!expectedModuleId) {
        throw Error("#1");
      }
      id = expectedModuleId;
      if (isAnonymousDefineWithDependencies(args)) {
        dependencies = args[0];
        factory = args[1];
      } else {
        factory = args[0];
      }
    } else {
      id = args[0] as ModuleId;
      if (expectedModuleId && expectedModuleId != id) {
        return resolveModule(id, {
          moduleState: ModuleState.ERROR,
          moduleError: Error("#2")
        });
      }
      if (isNamedDefineWithDependencies(args)) {
        dependencies = args[1];
        factory = args[2];
      } else {
        factory = args[1];
      }
    }

    const functionFactory =
      typeof factory === "function"
        ? factory
        : function() {
            return factory;
          };

    doDefine(id, dependencies, functionFactory);
  } as IamdeeDefineFunction;
  define["amd"] = {};

  window["define"] = define;
  window["requirejs"] = window["require"] = createRequire(
    "" as ModuleId,
    undefined
  );
})(window);
