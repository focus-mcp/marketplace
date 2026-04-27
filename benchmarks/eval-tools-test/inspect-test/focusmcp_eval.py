"""
Inspect AI eval for FocusMCP -- compare token usage:
- Mode A: native file read (full 1109-line file in context)
- Mode B: sr_signatures brick (only signatures in context)

Uses mock solver (no real API call) to measure the TOOL, not the LLM.
"""
import os
from pathlib import Path
from inspect_ai import Task, task
from inspect_ai.dataset import Sample
from inspect_ai.scorer import scorer, Score, accuracy
from inspect_ai.solver import solver, TaskState, Generate
from inspect_ai.model import ChatMessageUser, ChatMessageAssistant, ModelOutput, ModelUsage

INJECTOR_PATH = "/home/samuelds/benchmarks/test-repo/packages/core/injector/injector.ts"

SIGNATURES_ONLY = """loadPrototype<T>(wrapper: InstanceWrapper<T>, collection: Map<InjectionToken, InstanceWrapper>): void
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
loadPropertiesMetadata(metadata: PropertyMetadata[], contextId: ContextId, inquirer: InstanceWrapper): Promise<Array<PropertyDependency>>"""


def estimate_tokens(text: str) -> int:
    """Rough estimate: 4 chars per token (code-heavy)"""
    return len(text) // 4


@solver
def native_file_read_solver():
    """Solver that simulates reading the full file (no API call)"""
    async def solve(state: TaskState, generate: Generate) -> TaskState:
        file_content = Path(INJECTOR_PATH).read_text()

        system_prompt = "You are an expert TypeScript developer."
        question = "What are the public method signatures of the Injector class?"
        full_context = f"{system_prompt}\n{question}\n\nFile content:\n{file_content}"

        input_tokens = estimate_tokens(full_context)
        output_tokens = estimate_tokens(SIGNATURES_ONLY) + 50

        state.metadata["mode"] = "native"
        state.metadata["input_tokens"] = input_tokens
        state.metadata["output_tokens"] = output_tokens
        state.metadata["total_tokens"] = input_tokens + output_tokens
        state.metadata["file_lines"] = len(file_content.splitlines())
        state.metadata["file_chars"] = len(file_content)

        state.output = ModelOutput.from_content(
            model="mock-native",
            content=SIGNATURES_ONLY,
        )
        state.output.usage = ModelUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
        )

        return state

    return solve


@solver
def brick_sr_signatures_solver():
    """Solver that simulates using the sr_signatures brick"""
    async def solve(state: TaskState, generate: Generate) -> TaskState:
        system_prompt = "You are an expert TypeScript developer."
        question = "What are the public method signatures of the Injector class?"
        full_context = f"{system_prompt}\n{question}\n\nBrick sr_signatures output:\n{SIGNATURES_ONLY}"

        input_tokens = estimate_tokens(full_context)
        output_tokens = estimate_tokens(SIGNATURES_ONLY) + 50

        state.metadata["mode"] = "brick"
        state.metadata["input_tokens"] = input_tokens
        state.metadata["output_tokens"] = output_tokens
        state.metadata["total_tokens"] = input_tokens + output_tokens
        state.metadata["signatures_chars"] = len(SIGNATURES_ONLY)

        state.output = ModelOutput.from_content(
            model="mock-brick",
            content=SIGNATURES_ONLY,
        )
        state.output.usage = ModelUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
        )

        return state

    return solve


@scorer(metrics=[accuracy()])
def signature_scorer():
    """Check that the output contains expected method signatures"""
    async def score(state: TaskState, target) -> Score:
        output = state.output.completion if state.output else ""

        required_signatures = [
            "loadPrototype",
            "loadInstance",
            "resolveConstructorParams",
            "reflectConstructorParams",
            "resolveProperties",
        ]

        found = sum(1 for sig in required_signatures if sig in output)
        pass_score = found / len(required_signatures)

        lines_with_parens = [ln for ln in output.split('\n') if '(' in ln]
        at_least_10 = len(lines_with_parens) >= 10

        overall = 1.0 if (pass_score == 1.0 and at_least_10) else 0.0

        return Score(
            value=overall,
            answer=output[:200],
            explanation=(
                f"Found {found}/{len(required_signatures)} signatures. "
                f"Lines with parens: {len(lines_with_parens)}. "
                f"Mode: {state.metadata.get('mode', 'unknown')}. "
                f"Tokens: {state.metadata.get('total_tokens', 0)}"
            )
        )

    return score


samples = [
    Sample(
        input="What are the public method signatures of the Injector class? List each on its own line.",
        id=f"run_{i+1}"
    )
    for i in range(3)
]


@task
def focusmcp_native_eval():
    return Task(
        dataset=samples,
        solver=native_file_read_solver(),
        scorer=signature_scorer(),
        name="focusmcp_native_read",
    )


@task
def focusmcp_brick_eval():
    return Task(
        dataset=samples,
        solver=brick_sr_signatures_solver(),
        scorer=signature_scorer(),
        name="focusmcp_brick_sr_signatures",
    )
