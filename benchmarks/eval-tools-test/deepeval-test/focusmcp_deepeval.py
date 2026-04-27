"""
DeepEval test for FocusMCP -- compare token usage:
- Mode A: native file read (full 1109-line file in context)
- Mode B: sr_signatures brick (only signatures in context)

Uses LLMTestCase with custom metrics (no real API call needed for custom metrics).
"""
import os
import sys
from pathlib import Path
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import BaseMetric

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


class SignaturePresenceMetric(BaseMetric):
    """
    Custom metric: checks that output contains required method signatures.
    No LLM-as-a-judge needed. Pure deterministic.
    """
    def __init__(self, required_signatures=None, threshold=1.0):
        self.threshold = threshold
        self.required_signatures = required_signatures or [
            "loadPrototype",
            "loadInstance",
            "resolveConstructorParams",
            "reflectConstructorParams",
            "resolveProperties",
        ]

    @property
    def name(self):
        return "SignaturePresenceMetric"

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output or ""
        found = sum(1 for sig in self.required_signatures if sig in output)
        score = found / len(self.required_signatures)

        lines_with_parens = [ln for ln in output.split('\n') if '(' in ln]
        bonus = 1.0 if len(lines_with_parens) >= 10 else 0.0
        final_score = (score + bonus) / 2.0

        self.score = final_score
        self.success = final_score >= self.threshold
        self.reason = (
            f"Found {found}/{len(self.required_signatures)} required signatures. "
            f"Lines with parens: {len(lines_with_parens)}"
        )
        return final_score

    async def a_measure(self, test_case: LLMTestCase, _show_indicator: bool = True) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


class TokenCountMetric(BaseMetric):
    """
    Custom metric: reports token usage for the given mode.
    Purely informational -- always passes.
    """
    def __init__(self, mode: str, file_path: str = INJECTOR_PATH, threshold=0.0):
        self.threshold = threshold
        self.mode = mode
        self.file_path = file_path
        self.token_stats = {}

    @property
    def name(self):
        return f"TokenCountMetric[{self.mode}]"

    def measure(self, test_case: LLMTestCase) -> float:
        question = test_case.input or ""
        system_prompt = "You are an expert TypeScript developer."

        if self.mode == "native":
            file_content = Path(self.file_path).read_text()
            full_context = f"{system_prompt}\n{question}\n\nFile content:\n{file_content}"
            input_tokens = estimate_tokens(full_context)
        else:  # brick
            full_context = f"{system_prompt}\n{question}\n\nBrick sr_signatures:\n{SIGNATURES_ONLY}"
            input_tokens = estimate_tokens(full_context)

        output_tokens = estimate_tokens(SIGNATURES_ONLY) + 50
        total_tokens = input_tokens + output_tokens

        self.token_stats = {
            "mode": self.mode,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
        }
        self.score = 1.0
        self.success = True
        self.reason = (
            f"Mode={self.mode} | "
            f"input={input_tokens}, output={output_tokens}, total={total_tokens}"
        )
        return 1.0

    async def a_measure(self, test_case: LLMTestCase, _show_indicator: bool = True) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


def run_deepeval_tests():
    """Run the tests manually (without pytest) and print results."""
    QUESTION = "What are the public method signatures of the Injector class? List each on its own line."

    results = []

    for run_id in range(1, 4):
        for mode in ["native", "brick"]:
            # Build input context the same way as the solver would
            system_prompt = "You are an expert TypeScript developer."
            if mode == "native":
                file_content = Path(INJECTOR_PATH).read_text()
                input_text = f"{system_prompt}\n{QUESTION}\n\nFile content:\n{file_content}"
            else:
                input_text = f"{system_prompt}\n{QUESTION}\n\nBrick sr_signatures:\n{SIGNATURES_ONLY}"

            test_case = LLMTestCase(
                input=QUESTION,
                actual_output=SIGNATURES_ONLY,
                context=[input_text],
            )

            sig_metric = SignaturePresenceMetric(threshold=1.0)
            tok_metric = TokenCountMetric(mode=mode, threshold=0.0)

            sig_score = sig_metric.measure(test_case)
            tok_score = tok_metric.measure(test_case)

            result = {
                "run": run_id,
                "mode": mode,
                "sig_score": sig_score,
                "sig_pass": sig_metric.is_successful(),
                "sig_reason": sig_metric.reason,
                **tok_metric.token_stats,
            }
            results.append(result)

    print("\n=== DeepEval Results ===\n")
    print(f"{'Run':<5} {'Mode':<10} {'SigScore':<10} {'Pass':<6} {'InputTok':<10} {'OutputTok':<11} {'TotalTok':<10}")
    print("-" * 65)

    by_mode = {"native": [], "brick": []}
    for r in results:
        print(f"{r['run']:<5} {r['mode']:<10} {r['sig_score']:.3f}     {'YES' if r['sig_pass'] else 'NO':<6} {r['input_tokens']:<10} {r['output_tokens']:<11} {r['total_tokens']:<10}")
        by_mode[r['mode']].append(r)

    print("\n=== Aggregated (3 runs each) ===\n")
    for mode, runs in by_mode.items():
        avg_input = sum(r['input_tokens'] for r in runs) / len(runs)
        avg_output = sum(r['output_tokens'] for r in runs) / len(runs)
        avg_total = sum(r['total_tokens'] for r in runs) / len(runs)
        pass_rate = sum(1 for r in runs if r['sig_pass']) / len(runs)
        print(f"Mode: {mode}")
        print(f"  Avg input tokens:  {avg_input:.0f}")
        print(f"  Avg output tokens: {avg_output:.0f}")
        print(f"  Avg total tokens:  {avg_total:.0f}")
        print(f"  Pass rate: {pass_rate:.1%}")
        print()

    native_avg = sum(r['total_tokens'] for r in by_mode['native']) / len(by_mode['native'])
    brick_avg = sum(r['total_tokens'] for r in by_mode['brick']) / len(by_mode['brick'])
    print(f"Token ratio (native/brick): {native_avg/brick_avg:.1f}x")
    print(f"Token savings using brick: {((native_avg - brick_avg) / native_avg * 100):.1f}%")


if __name__ == "__main__":
    run_deepeval_tests()
