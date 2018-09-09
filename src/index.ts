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
  interface ArrayMap<TKey, TValue> {
    get: (key: TKey) => TValue | undefined;
    set: (key: TKey, value: TValue) => void;
  }

  function map<TKey, TValue>(): ArrayMap<TKey, TValue> {
    const keys: TKey[] = [];
    const values: TValue[] = [];
    return {
      get(key) {
        return values[keys.indexOf(key)];
      },
      set(key, value) {
        const index = keys.indexOf(key);
        if (index == -1) {
          keys.push(key);
          values.push(value);
        } else {
          values[index] = value;
        }
      }
    };
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
  type RequestId = string & { readonly __tag: unique symbol };

  interface ModuleCallback {
    (module: Module): void;
  }

  interface DefinedModule {
    id: ModuleId;
    requestId?: RequestId;
    moduleState: ModuleState.DEFINED;
    load: (requestId: RequestId) => void;
    callbacks: ModuleCallback[];
  }

  interface NetworkLoadingModule {
    id: ModuleId;
    requestId: RequestId;
    moduleState: ModuleState.NETWORK_LOADING;
    callbacks: ModuleCallback[];
  }

  interface WaitingForDependenciesModule {
    id: ModuleId;
    requestId: RequestId;
    moduleState: ModuleState.WAITING_FOR_DEPENDENCIES;
    callbacks: ModuleCallback[];
    exports: {};
  }

  interface InitializedModule {
    id: ModuleId;
    moduleState: ModuleState.INITIALIZED;
    exports: unknown;
  }

  interface ErrorModule {
    id: ModuleId;
    moduleState: ModuleState.ERROR;
    error: Error;
  }

  type Module =
    | DefinedModule
    | NetworkLoadingModule
    | WaitingForDependenciesModule
    | InitializedModule
    | ErrorModule;

  const moduleMap: ArrayMap<ModuleId, Module> = map();
  const elementMap: ArrayMap<Element, ModuleId> = map();
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

  function resolveModule(module: InitializedModule | ErrorModule) {
    const currentModule = moduleMap.get(module.id);
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
    moduleMap.set(module.id, module);
    currentModule.callbacks.forEach(function(cb) {
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
    const module = moduleMap.get(id);
    if (!module) {
      const src = /^\/|^\w+:|\.js$/.test(id) ? id : baseUrl + id + ".js";
      const module = loadModule(id, src as SourceUrl, requestId, callback);
      moduleMap.set(id, module);
    } else {
      if (
        module.moduleState == ModuleState.INITIALIZED ||
        module.moduleState == ModuleState.ERROR
      ) {
        defer(callback, [module]);
      } else if (module.moduleState == ModuleState.NETWORK_LOADING) {
        module.callbacks.push(callback);
      } else if (module.moduleState == ModuleState.DEFINED) {
        module.callbacks.push(callback);
        module.load(requestId);
      } else if (module.moduleState == ModuleState.WAITING_FOR_DEPENDENCIES) {
        // Circular dependency
        if (module.requestId == requestId) {
          defer(callback, [module]);
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

    const require = function(
      moduleIdOrDependencyPathList: ModuleId | ModulePath[],
      onSuccess?: IamdeeRequireCallback,
      onError?: (error: Error) => unknown
    ) {
      if (isModuleId(moduleIdOrDependencyPathList)) {
        const module = moduleMap.get(moduleIdOrDependencyPathList);
        if (!module || module.moduleState !== ModuleState.INITIALIZED) {
          throw Error("#3 " + moduleIdOrDependencyPathList);
        }
        return module.exports;
      }
      const dependencyIds = moduleIdOrDependencyPathList.map(modulePathToId);
      let remainingDependencies = moduleIdOrDependencyPathList.length + 1;
      const rId = requestId || ((Math.random() + "") as RequestId);

      function ensureCommonJsDependencies() {
        let cjsModule: { exports: unknown } = { exports: {} };
        const module = moduleMap.get(moduleId);
        if (module) {
          if (module.moduleState != ModuleState.WAITING_FOR_DEPENDENCIES) {
            return panic("Unexpected module state");
          }
          cjsModule = module;
        }
        moduleMap.set("require", {
          id: "require",
          moduleState: ModuleState.INITIALIZED,
          exports: require
        });
        moduleMap.set("exports", {
          id: "exports",
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule.exports
        });
        moduleMap.set("module", {
          id: "module",
          moduleState: ModuleState.INITIALIZED,
          exports: cjsModule
        });
      }

      function dependencyReadyCallback() {
        if (--remainingDependencies == 0) {
          ensureCommonJsDependencies();
          try {
            const dependencies: unknown[] = dependencyIds.map(function(id) {
              const module = moduleMap.get(id);
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
      dependencyIds.forEach(function(id) {
        request(id, rId, dependencyReadyCallback);
      });
      dependencyReadyCallback();
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
    const el = doc.createElement("script");
    elementMap.set(el, id);
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
      resolveModule({ id, moduleState: ModuleState.ERROR, error });
    };
    doc.head.appendChild(el);
    return {
      id,
      requestId,
      moduleState: ModuleState.NETWORK_LOADING,
      callbacks: [callback]
    };
  }

  function throwError(error: Error) {
    throw error;
  }

  function defer<T extends any[]>(fn: (...args: T) => void, args: T) {
    setTimeout(function() {
      fn.apply(undefined, args);
    });
  }

  function doDefine(
    id: ModuleId,
    dependencies: string[],
    factory: IamdeeDefineFactoryFunction
  ) {
    const existingModule = moduleMap.get(id);
    const definedModule: DefinedModule = {
      moduleState: ModuleState.DEFINED,
      id,
      callbacks: [],
      load(requestId) {
        const waitingModule: WaitingForDependenciesModule = {
          id,
          requestId,
          moduleState: ModuleState.WAITING_FOR_DEPENDENCIES,
          callbacks: definedModule.callbacks,
          exports: {}
        };
        moduleMap.set(id, waitingModule);
        const localRequire = createRequire(id, requestId);
        localRequire(
          dependencies,
          function() {
            const result = factory.apply(undefined, arguments);
            const exports =
              result === undefined ? waitingModule.exports : result;
            resolveModule({
              id,
              moduleState: ModuleState.INITIALIZED,
              exports
            });
          },
          function(error) {
            resolveModule({ id, moduleState: ModuleState.ERROR, error });
          }
        );
      }
    };
    moduleMap.set(id, definedModule);
    if (existingModule) {
      if (existingModule.moduleState != ModuleState.NETWORK_LOADING) {
        return panic("Trying to define a module that is in a wrong state");
      }
      definedModule.callbacks = existingModule.callbacks;
      definedModule.load(existingModule.requestId);
    }
  }

  // This is a live node list, so we do not need to re-query
  const scripts = doc.getElementsByTagName("script");

  function getCurrentScript() {
    let script = doc["currentScript"];
    if (script) {
      return script;
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
            return script;
          } else if ((script as any).readyState == "interactive") {
            return script;
          }
        }
      }
    }
  }

  const define = function() {
    const args = (arguments as any) as IamdeeDefineArgs;
    const script = getCurrentScript();
    const expectedModuleId = script && elementMap.get(script);

    let id: ModuleId;
    let dependencies = ["require", "exports", "module"];
    let factory: IamdeeDefineFactory = noop;

    if (isAnonymousDefine(args)) {
      if (!expectedModuleId) {
        return defer(throwError, [Error("#1")]);
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
        return resolveModule({
          id,
          moduleState: ModuleState.ERROR,
          error: Error("#2")
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
