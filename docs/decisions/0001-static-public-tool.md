# ADR 0001: Publish a narrow static public tool

Status: accepted

Date: 2026-11-14

## Context

AHAEM and CEXAH need discoverable, useful public assets. Publishing either full
private application would expose commercial logic, affiliate parameters and
maintenance complexity. A thin bridge page would add little independent value.

## Decision

Publish a separate static calculator focused on one transfer-cost task. Keep the
calculation in dependency-free JavaScript, test it with Node's built-in test
runner and deploy `dist/` to GitHub Pages.

The page links to AHAEM and CEXAH only where their broader services match the
user's next task. It discloses that AHAEM built the tool.

## Consequences

- The repository can be public without exposing the private sites.
- The calculation is portable and embeddable.
- The model deliberately excludes taxes, price movement and region eligibility.
- GitHub Pages is distribution infrastructure, not a ranking guarantee.
- New calculators should use separate task pages or repositories rather than
  turning this page into a generic directory.
