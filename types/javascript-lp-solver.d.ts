// javascript-lp-solver ships no bundled TypeScript types and there is no @types package
// on npm for it. This is a minimal ambient declaration covering only the surface this
// repo uses (lib/quant/cvar-optimizer.ts) — the library's actual runtime API is broader.
declare module 'javascript-lp-solver' {
  export interface LPConstraint {
    min?: number;
    max?: number;
    equal?: number;
  }

  export interface LPVariable {
    [constraintOrObjectiveName: string]: number;
  }

  export interface LPModel {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, LPConstraint>;
    variables: Record<string, LPVariable>;
    ints?: Record<string, boolean>;
    binaries?: Record<string, boolean>;
    // Variables listed here (value 1) are "free" — not restricted to the solver's default
    // lower bound of 0. Required for zeta (the VaR threshold) in the CVaR LP, which can be
    // negative (e.g. a defensive portfolio whose worst scenario is still a small gain).
    unrestricted?: Record<string, 1>;
    options?: {
      timeout?: number;
      tolerance?: number;
    };
  }

  export interface LPSolution {
    feasible: boolean;
    result: number;
    bounded?: boolean;
    isIntegral?: boolean;
    [variableName: string]: number | boolean | undefined;
  }

  const solver: {
    Solve(model: LPModel): LPSolution;
  };

  export default solver;
}
