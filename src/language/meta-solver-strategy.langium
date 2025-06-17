grammar MetaSolverStrategy

entry SolveProblem:
    "solve"
     (problemType=ProblemType problemName=ProblemName ":"
        solve=Solve
    | problemTypes=ProblemTypes problemName=ProblemArrayName ":" // TODO: enforce solve many when subroutine is an array
        solve=SolveMany);

ProblemType:
    problemType=ID;

ProblemTypes:
    problemType=ProblemType "[]";

ProblemName:
    name=NAME;

ProblemArrayName:
    name=NAME;

ProblemAttribute:
    ProblemAttributeInt;

ProblemAttributeInt:
    size=NAME; // TODO: only allow attributes that are valid for the problem type

// ProblemAttributeString:
//     size="size"; // TODO: only allow attributes that are valid for the problem type

Solve:
    If
    | Solver;

SolveMany:
    Foreach;

Foreach:
    "foreach" variable=ProblemName "in" collection=[ProblemArrayName:NAME] ":"
        solve=Solve;

If:
    "if" condition+=Condition ":"
        solve+=Solve
    Else;

Else:
    "else"
     ( "if" condition+=Condition ":"
            solve+=Solve
        Else
    // We always want to handle the else case to make sure a problem is always solved somehow
     |  ":"
            solve+=Solve);

Condition:
    Comparison;
// | Comparison "&&" Comparison // TODO: add support for logical operators
// | Comparison "||" Comparison
// | "(" condition=Condition ")";

Comparison:
    ComparisonInteger
    | ComparisonString;

ComparisonInteger:
    problemName=[ProblemName:NAME] "." attribute=ProblemAttributeInt operator=ComparisonOperatorInteger value=INT; // TODO: make sure types match

ComparisonString:
    problemName=[ProblemName:NAME] "." attribute=ProblemAttributeInt operator=ComparisonOperatorString value=STRING; // TODO: make sure types match

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
    problemName=[ProblemName:NAME] "." solverId=SolverID "(" (settings+=SolverSetting ("," settings+=SolverSetting)* )? ")"
        SubRoutines?;

SolverSetting:
    settingName=STRING "=" settingValue=STRING;

SolverID:
    solverId=ID;

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
