# Editor Setup

1. Install the NestJS CLI and the Langium generator CLI.
```bash
npm install -g @nestjs/cli
npm install -g langium-cli
```

2. Generate parser for the Langium grammar
```bash
yarn workspace langium-core langium:generate
```

3. Build the common packages
```bash
yarn workspace langium-core build
yarn workspace toolbox-api build
```

4. Start the editor
```bash
yarn workspace editor dev
```

# Interpreter Setup

- Start the server
```bash
yarn workspace interpreter dev
```

# Meta Solver Strategy Language

The Meta Solver Strategy Language is a DSL used for the ProvideQ Toolbox.
The DSL allows users to easily express Meta Solver Strategies representing a strategy to solve a certain problem based on rules and heuristics which can be explicitely encoded in the language.
As part of the strategy, a large problem can be decomposed into smaller problems.

For example, a rule based on the problem size can be used to decide if a problem should be clustered into multiple smaller problems which are solved individually, instead of solving one large problem.
```
solve VRP vrp:
  if vrp.dimension > 10:
    vrp.ClusterAndSolveVrpSolver():
      solve ClusterVRP clustervrp:
        ...
  else:
    vrp.QrispVrpSolver()
```

## Solve Statements
```
solve VRP vrp:
  vrp.QrispVrpSolver()
```

Every strategy starts with a solve statement which is started by the `solve` keyword, followed by a [problem type](https://api.provideq.kit.edu/problems) and a name for the current instance of the problem type.

This can be followed by a call to invoke a certain [problem solver](https://api.provideq.kit.edu/solvers/VRP) for the given problem type, here VRP.

For more complex strategies, one might want to create branching instructions where the strategy decides varying solution paths based on the given problem instance and its characteristics.


## Sub Routine Calls
```
solve SAT sat:
  sat.QrispExactGroverSolver():
    solve SharpSAT sharpsat:
      sharpsat.GanakSolver()
```

This is a problem where the solver call `sat.QrispExactGroverSolver()` doesn't end the strategy, because the solver `QrispExactGroverSolver` defines a sub routine to call a `SharpSAT` problem. This is syntactically represented with a `:` following the solver call, and another nested solve statement.

## Solver Setting Configuration

```
solve QUBO qubo:
  qubo.DwaveQuboSolver(
    "D-Wave Token" = "some-token",
    "Annealing Method" = "sim")
```

Some solvers also define certain settings which might need to be configured to when calling the solver.
In the Meta Solver Strategy Language solver settings can be defined within the solve paratheses and passed as arguments.
Each solver setting argument needs to specify the exact solver setting name on the left hand side and the value on the right hand side.

## Branching Solver Strategies

```
solve VRP vrp:
  if vrp.dimension > 10:
    vrp.ClusterAndSolveVrpSolver():
      solve ClusterVRP clustervrp:
        ...
  else if vrp.dimension > 5:
    vrp.LkhVrpSolver()
  else:
    vrp.QrispVrpSolver()
```

The real power of explicitly creating a Meta Solver Strategy comes from branching.
Here it is possible to alternate the solution path based on the specific problem instance that the strategy is used for.
All if branches must fully saturate all possible control paths, which means that there must always be a fallback else branch to define a default solve behavior.
The conditions in if branches can evaluate attributes unique the current problem type of a problem instance, here problem type `VRP` for `vrp` has the attribute `dimension`.

For example, this `VRP` problem is solved with a standard solver if the problem dimension isn't too big, but in case the dimension exceeds 10, a different path is chosen and the problem is clustered and solved in smaller chunks and solved with a divide-and-conquer strategy, which is often needed to reduce the overall solver runtime.

This enables users to create a vast amount of different Meta Solver Strategies built for various use cases.

## Nested Meta Solver Strategy Calls (WIP)
```
solve SharpSAT sharpsat:
  if sharpsat.variable_count > 100:
    sharpsat.GanakSolver()
  else:
    sharpsat.PythonBruteForceSolver()
```

Given this Meta Solver Strategy with the name SolveSharpSatWithGanak to solve a `SharpSAT` problem, we can reuse this strategy in other Meta Solver Strategies.

```
solve SAT sat:
  sat.QrispExactGroverSolver():
    solve SharpSAT sharpsat:
      sharpsat.SolveSharpSatWithGanak()
```
Instead of writing the if/else statements or specific solver calls to define the strategy to solve the `SharpSAT` subroutine, we can also call a Meta Solver Strategy that solves `SharpSAT`.