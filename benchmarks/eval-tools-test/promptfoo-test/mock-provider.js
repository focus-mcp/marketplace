/**
 * Mock provider for Promptfoo testing
 * Promptfoo v0.121+ custom providers: export function with id(), callApi() methods
 * Simulates token counting for 2 modes:
 * - native: reads full file (~4000+ tokens input)
 * - brick: receives only signatures (~400 tokens input)
 */
const fs = require("fs");

// Approximate tokenizer: ~4 chars per token (rough estimate for code)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

const INJECTOR_PATH =
  "/home/samuelds/benchmarks/test-repo/packages/core/injector/injector.ts";

const SIGNATURES_ONLY = `loadPrototype<T>(wrapper: InstanceWrapper<T>, collection: Map<InjectionToken, InstanceWrapper>): void
loadInstance<T>(wrapper: InstanceWrapper<T>, collection: Map<InjectionToken, InstanceWrapper>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>
loadMiddleware(wrapper: InstanceWrapper, collection: Map<InjectionToken, InstanceWrapper>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>
loadController(wrapper: InstanceWrapper<Controller>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>
loadInjectable<T = any>(wrapper: InstanceWrapper<T>, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<void>
loadProvider(wrapper: InstanceWrapper, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<void>
applySettlementSignal<T>(settlementSignal: SettlementSignal, wrapper: InstanceWrapper<T>): InstanceWrapper<T>
resolveConstructorParams<T>(wrapper: InstanceWrapper<T>, moduleRef: Module, inject: InjectorDependency[], callback: (args: unknown[]) => void | Promise<void>, contextId?: ContextId, inquirer?: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<void>
getClassDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]]
getFactoryProviderDependencies<T>(wrapper: InstanceWrapper<T>): [InjectorDependency[], number[]]
reflectConstructorParams<T>(type: Type<T>): any[]
reflectOptionalParams<T>(type: Type<T>): any[]
reflectSelfParams<T>(type: Type<T>): any[]
resolveSingleParam<T>(wrapper: InstanceWrapper<T>, param: unknown, dependencyContext: InjectorDependencyContext, moduleRef: Module, contextId?: ContextId, inquirer?: InstanceWrapper, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper>
resolveParamToken<T>(wrapper: InstanceWrapper<T>, param: Type<any> | string | symbol | any): Type<any> | string | symbol | any
resolveComponentWrapper<T>(dependencyContext: InjectorDependencyContext, moduleRef: Module, contextId: ContextId, inquirer: InstanceWrapper): Promise<InstanceWrapper>
resolveComponentHost<T>(moduleRef: Module, instanceWrapper: InstanceWrapper<T | Promise<T>>, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<InstanceWrapper>
lookupComponent<T = any>(instances: Map<InjectionToken, InstanceWrapper>, moduleRef: Module, dependencyContext: InjectorDependencyContext, wrapper: InstanceWrapper<T>, contextId?: ContextId, inquirer?: InstanceWrapper, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper>
lookupComponentInParentModules<T = any>(dependencyContext: InjectorDependencyContext, moduleRef: Module, wrapper: InstanceWrapper<T>, contextId?: ContextId, inquirer?: InstanceWrapper, keyOrIndex?: symbol | string | number): Promise<InstanceWrapper>
lookupComponentInImports(moduleRef: Module, name: InjectionToken, wrapper: InstanceWrapper, moduleRegistry?: any[], contextId?: ContextId, inquirer?: InstanceWrapper, keyOrIndex?: symbol | string | number, isTraversed?: boolean): Promise<InstanceWrapper>
resolveProperties<T>(wrapper: InstanceWrapper<T>, moduleRef: Module, inject?: InjectionToken[], contextId?: ContextId, inquirer?: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<PropertyDependency[]>
reflectProperties<T>(type: Type<T>): PropertyDependency[]
applyProperties<T = any>(instance: T, properties: PropertyDependency[]): void
instantiateClass<T = any>(instances: any[], wrapper: InstanceWrapper, targetMetatype: InstanceWrapper, contextId?: ContextId, inquirer?: InstanceWrapper): Promise<T>
loadPerContext<T = any>(wrapper: InstanceWrapper<T>, moduleRef: Module, collection: Map<InjectionToken, InstanceWrapper>, ctx: ContextId, inquirer?: InstanceWrapper): Promise<InstanceWrapper<T>>
loadEnhancersPerContext(wrapper: InstanceWrapper, ctx: ContextId, collection: Map<string, InstanceWrapper>): Promise<void>
loadCtorMetadata(metadata: InstanceWrapper[], contextId: ContextId, inquirer: InstanceWrapper, parentInquirer?: InstanceWrapper): Promise<any[]>
loadPropertiesMetadata(metadata: PropertyMetadata[], contextId: ContextId, inquirer: InstanceWrapper): Promise<Array<PropertyDependency>>`;

function createNativeProvider() {
  return {
    id: () => "mock-native-file-read",
    callApi: async (prompt) => {
      const fileContent = fs.readFileSync(INJECTOR_PATH, "utf-8");
      const systemPrompt =
        "You are an expert TypeScript developer. Answer questions about code.";
      const fullPrompt =
        systemPrompt + "\n" + prompt + "\n\nFile content:\n" + fileContent;
      const inputTokens = estimateTokens(fullPrompt);
      const outputTokens = estimateTokens(SIGNATURES_ONLY) + 50;

      return {
        output: SIGNATURES_ONLY,
        tokenUsage: {
          total: inputTokens + outputTokens,
          prompt: inputTokens,
          completion: outputTokens,
        },
      };
    },
  };
}

function createBrickProvider() {
  return {
    id: () => "mock-brick-sr-signatures",
    callApi: async (prompt) => {
      const systemPrompt =
        "You are an expert TypeScript developer. Answer questions about code.";
      const fullPrompt =
        systemPrompt +
        "\n" +
        prompt +
        "\n\nBrick sr_signatures output:\n" +
        SIGNATURES_ONLY;
      const inputTokens = estimateTokens(fullPrompt);
      const outputTokens = estimateTokens(SIGNATURES_ONLY) + 50;

      return {
        output: SIGNATURES_ONLY,
        tokenUsage: {
          total: inputTokens + outputTokens,
          prompt: inputTokens,
          completion: outputTokens,
        },
      };
    },
  };
}

// Promptfoo v0.121+ expects a default export function that returns provider object
module.exports = function (options) {
  const mode = (options && options.config && options.config.mode) || "native";
  if (mode === "brick") {
    return createBrickProvider();
  }
  return createNativeProvider();
};
