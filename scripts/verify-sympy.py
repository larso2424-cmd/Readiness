#!/usr/bin/env python3
"""
SymPy verification subprocess.
Receives JSON on stdin: { "sympy_check": "python code string" }
Returns JSON on stdout: { "passed": true/false, "error": "..." }

The sympy_check code must set variable `result = True` if the answer is correct.
"""
import sys
import json
import traceback
import math

try:
    import sympy
    from sympy import (
        symbols, Symbol, solve, simplify, expand, factor,
        sqrt, Rational, pi, E, I, oo, sin, cos, tan,
        asin, acos, atan, log, exp, diff, integrate,
        limit, Matrix, Eq, Ne, Lt, Le, Gt, Ge,
        Abs, ceiling, floor, factorial, binomial,
        Sum, Product, series, And, Or, Not,
        Piecewise, FiniteSet, Interval, solveset,
        Poly, Number, Integer, Float, zoo, nan,
    )
    SYMPY_AVAILABLE = True
except Exception:
    SYMPY_AVAILABLE = False

def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        code = data.get("sympy_check", "")
        if not code.strip():
            print(json.dumps({"passed": False, "error": "Empty sympy_check"}))
            return

        if not SYMPY_AVAILABLE:
            print(json.dumps({"passed": False, "error": "sympy not installed"}))
            return

        # Build execution namespace with all sympy names pre-imported
        # so the code can use them without needing import statements
        ns = {
            "__builtins__": {"print": print, "abs": abs, "len": len,
                             "range": range, "list": list, "tuple": tuple,
                             "dict": dict, "set": set, "int": int, "float": float,
                             "str": str, "bool": bool, "round": round,
                             "min": min, "max": max, "sum": sum, "any": any, "all": all,
                             "True": True, "False": False, "None": None},
            "math": math,
            "sympy": sympy,
            # Common sympy names available directly
            "symbols": symbols, "Symbol": Symbol, "solve": solve,
            "simplify": simplify, "expand": expand, "factor": factor,
            "sqrt": sqrt, "Rational": Rational, "pi": pi, "E": E,
            "I": I, "oo": oo, "sin": sin, "cos": cos, "tan": tan,
            "asin": asin, "acos": acos, "atan": atan, "log": log, "exp": exp,
            "diff": diff, "integrate": integrate, "limit": limit,
            "Matrix": Matrix, "Eq": Eq, "Ne": Ne, "Lt": Lt, "Le": Le,
            "Gt": Gt, "Ge": Ge, "Abs": Abs, "ceiling": ceiling, "floor": floor,
            "factorial": factorial, "binomial": binomial,
            "Sum": Sum, "Product": Product, "series": series,
            "And": And, "Or": Or, "Not": Not, "Piecewise": Piecewise,
            "FiniteSet": FiniteSet, "Interval": Interval, "solveset": solveset,
            "Number": Number, "Integer": Integer, "Float": Float,
        }

        # Strip any `from sympy import ...` or `import sympy` lines
        # since everything is already in scope
        clean_lines = []
        for line in code.split('\n'):
            stripped = line.strip()
            if stripped.startswith('from sympy') or stripped.startswith('import sympy') or stripped.startswith('import math'):
                continue
            clean_lines.append(line)
        clean_code = '\n'.join(clean_lines)

        local_vars = {}
        exec(clean_code, ns, local_vars)

        result = local_vars.get("result", None)
        if result is None:
            # Also check in ns
            result = ns.get("result", None)

        if result is None:
            print(json.dumps({"passed": False, "error": "sympy_check did not set `result` variable"}))
        elif result is True or result == True:
            print(json.dumps({"passed": True, "error": None}))
        else:
            print(json.dumps({"passed": False, "error": f"result was {repr(result)}, expected True"}))

    except Exception:
        print(json.dumps({"passed": False, "error": traceback.format_exc(limit=5)}))

if __name__ == "__main__":
    main()
