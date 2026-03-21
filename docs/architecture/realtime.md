# Realtime Architecture

## Current status
Explain whether realtime is fully real, partially simulated, or planned.

## Current provider / integration seam
Document the main provider/context file(s) responsible for realtime state.

## Current flow
Describe:
1. event source
2. provider update
3. hook/component consumption
4. UI update

## Simulated behavior
List what is currently mocked/simulated and how it behaves.

## Future real backend contract
Describe what the ideal backend event/API contract should become.

## Risks
- duplicate updates
- stale provider state
- mismatched UI/backend assumptions
- race conditions
- event naming inconsistencies

## Editing rules
- trace full flow before editing
- do not patch symptoms only in UI
- document any contract changes