# Security Policy

## Reporting a Vulnerability

Please do not open public GitHub issues for suspected security vulnerabilities.

Report vulnerabilities privately to the repository owner through a private contact channel or GitHub private vulnerability reporting if enabled.

When reporting, include:
- affected area or file
- reproduction steps
- impact
- any suggested mitigation

## Scope Notes

Oakwell uses:
- Clerk for end-user authentication controls such as password hashing, email verification, session management, password reset flows, and bot/login protection
- a same-origin Next.js proxy plus internal backend secret for protected dashboard API access

## Operational Expectations

Before production launch:
- set all secrets via environment variables only
- rotate any test/demo keys
- enable Clerk security features
- verify owner-scoped access controls across backend resources
- enable secret scanning and dependency monitoring
