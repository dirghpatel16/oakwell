# Frontend Architecture

## Purpose
Describe the frontend’s job in the system.

## App structure
Document:
- route groups
- dashboard structure
- shared UI/component system
- provider layout

## Auth model
Explain Clerk/auth route protection and user flow.

## Main frontend domains
- onboarding
- dashboard
- analytics/views
- alerts/operations
- settings/admin if applicable

## State model
Document where state should live:
- local component state
- shared provider state
- server/state fetched from backend
- temporary simulated data

## Component rules
- shared components live in ...
- route-specific logic lives in ...
- providers live in ...
- hooks live in ...

## Frontend constraints
- avoid duplicate data sources
- preserve protected route structure
- keep product UX stable