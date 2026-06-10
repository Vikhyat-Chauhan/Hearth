# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Hearth, please report it **privately** — do
not open a public GitHub issue, pull request, or discussion, as that exposes the issue
before a fix is available.

To report:

- Use **GitHub's private vulnerability reporting** (the repository's *Security* tab →
  *Report a vulnerability*), **or**
- Email the maintainer at **vikhyat.chauhan@gmail.com** with the subject line
  `Hearth security`.

Please include:

- A description of the issue and its potential impact.
- Steps to reproduce (a proof of concept if you have one).
- Any affected URLs, routes, or components.

## What to expect

- We aim to acknowledge a report within **3 business days**.
- We'll keep you updated on the assessment and remediation, and coordinate disclosure
  timing with you once a fix is ready.
- Please give us a reasonable window to address the issue before any public disclosure.

## Scope

In scope: the Hearth application code in this repository and its deployment at
`https://hearth-ruby-eight.vercel.app`. Out of scope: vulnerabilities in third-party
platforms we build on (Vercel, Supabase, Google) — report those to the respective vendor.

## Operational hardening

How the production deployment is secured (rate limiting, webhook authentication, secret
handling, RLS) is documented for operators in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).
