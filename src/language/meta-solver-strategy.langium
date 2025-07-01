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
    name=NAME;

BoolExpression:
    "true" | "false"
    | lhs=Expression operator=ComparisonOperator rhs=Expression;

Expression:
    INT
    | STRING
    | problemName=[ProblemName:NAME] "." attribute=ProblemAttribute;

Solve:
    If
    | Solver;

SolveMany:
    Foreach;

Foreach:
    "foreach" variable=ProblemName "in" collection=[ProblemArrayName:NAME] ":"
        solve=Solve;

If:
    "if" condition+=BoolExpression ":"
        solve+=Solve
    Else;

Else:
    "else"
     ( "if" condition+=BoolExpression ":"
            solve+=Solve
        Else
    // We always want to handle the else case to make sure a problem is always solved somehow
     |  ":"
            solve+=Solve);

ComparisonOperator:
    less="<"
    | lessOrEqual="<="
    | greater=">"
    | greaterOrEqual=">="
    | equal="=="
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
