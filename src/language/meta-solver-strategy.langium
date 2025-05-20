// Solve VRP vrp:
//   if vrp.size > 10:
//     vrp.Cluster():
//       Solve TSP[] tsps:
//         foreach tsp in tsps:
//           tsp.Qubo():
//             Solve QUBO qubo:
//               qubo.Qrisp()
//   else:
//     vrp.Lkh3()
      
grammar MetaSolverStrategy

entry SolveProblem:
    "Solve" type=ProblemType problemName=ProblemName ":"
        solve=Solve
    | "Solve" type=ProblemTypes problemName=ProblemArrayName ":" // TODO: enforce solve many when subroutine is an array
        solve=SolveMany;

ProblemType:
    type=ID; // TODO: enforce type is a valid problem type from a list of given problem types

ProblemTypes:
    type=ProblemType "[]";

ProblemName:
    name=NAME; // TOOD: make sure problem name is only used once in file/scope

ProblemArrayName:
    name=NAME; // TOOD: make sure problem name is only used once in file/scope

ProblemAttribute:
    ProblemAttributeInt;

ProblemAttributeInt:
    size="size"; // TODO: only allow attributes that are valid for the problem type

// ProblemAttributeString:
//     size="size"; // TODO: only allow attributes that are valid for the problem type

Solve:
    If
    | Solver;

SolveMany:
    Foreach;

Foreach:
    "foreach" variable=ProblemName "in" collection=ProblemArrayName ":"
        solve=Solve;

If:
    "if" condition=Condition ":"
        solve=Solve
    "else:"
        elseSolve=Solve;

Condition:
    Comparison;
// | Comparison "&&" Comparison // TODO: add support for logical operators
// | Comparison "||" Comparison
// | "(" condition=Condition ")";

Comparison:
    ComparisonInteger
    | ComparisonString;

ComparisonInteger:
    problemName=ProblemName "." attribute=ProblemAttributeInt operator=ComparisonOperatorInteger value=INT; // TODO: make sure types match

ComparisonString:
    problemName=ProblemName "." attribute=ProblemAttributeInt operator=ComparisonOperatorString value=INT; // TODO: make sure types match

ComparisonOperatorInteger:
    less="<"
    | lessOrEqual="<="
    | greater=">"
    | greaterOrEqual=">="
    | equal="=="
    | notEqual="!=";

ComparisonOperatorString:
    equal="=="
    | notEqual="!=";

Solver:
    name=ProblemName "." type=ID "()"
        SubRoutines?;

SubRoutines:
    ":"
        ( subRoutine+=SolveProblem )+;

hidden terminal WS: /\s+/;
terminal NL: /\r?\n/;
terminal NAME: /[a-z][\w_]*/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
