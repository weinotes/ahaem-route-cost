# AHAEM Crypto Transfer Cost Calculator

An independent, open-source calculator for the fixed and percentage costs of
moving crypto. It runs entirely in the browser: no account, wallet connection,
cookies or server-side input processing.

Pages after the next deployment:

- English: <https://weinotes.github.io/ahaem-route-cost/>
- Simplified Chinese: <https://weinotes.github.io/ahaem-route-cost/zh-CN/>

The tool is built by AHAEM and links to two relevant next steps:

- [AHAEM route planner](https://www.ahaem.com/tools/route-cost/) for complete
  multi-step routes, networks and wallet constraints.
- [CEXAH trading-cost comparison](https://www.cexah.com/tools/trading-cost-comparison)
  for exchange, derivatives and trading-cost research.

The calculator is useful on its own. The links are contextual next steps, not a
redirect gate.

## What it calculates

- fixed withdrawal, network and other fees;
- percentage platform, conversion and route/slippage costs;
- net received amount;
- total modeled cost and effective cost percentage;
- cost per 1,000 units sent.

All values use integer arithmetic with eight decimal places. The model does not
include taxes, price movement, fees charged in another asset, account
eligibility or counterparty risk.

## Local development

Requires Node.js 24 or newer.

```bash
npm test
npm run build
npm run validate
npm run dev
```

The development server prints its local URL. The production build is written to
`dist/`.

For a custom origin:

```bash
SITE_URL=https://example.com/tool/ npm run build
```

The Chinese page is generated at `zh-CN/` under the configured origin. The
build adds reciprocal `hreflang` metadata and bilingual sitemap alternates.

For a Gitee Pages mirror, build with the Gitee Pages root:

```bash
SITE_URL=https://<user>.gitee.io/<repository>/ npm run check
```

## Quality gates

`npm run check` runs unit tests, creates the production build and validates:

- one H1 and self-canonical metadata for each locale;
- reciprocal `en`, `zh-CN` and `x-default` hreflang links;
- a CJK-specific minimum Han-character gate in addition to word counts;
- JSON-LD parseability;
- bilingual sitemap and robots consistency;
- required static assets;
- absence of analytics and affiliate parameters;
- a small deployment size budget.

The same `npm run check` command is used before publishing. The current
branch-based Pages release publishes only the generated `dist/` directory to
the `gh-pages` branch:

```bash
npm run deploy:pages
```

Pinned GitHub Actions workflow templates are included under
`docs/automation/` for maintainers whose GitHub token has the `workflow` scope.
They should replace the branch publisher after review.

## Structure

```text
site/                    static application
tests/                   calculation regression tests
scripts/                 build, preview, publish and validation
docs/backlink-program.md outreach and distribution plan
docs/backlink-prospects.csv editable prospect tracker
docs/seo-geo-profile.json page-level index policy
```

## Privacy

The calculator does not transmit entered values. It does not load third-party
analytics or advertising scripts. GitHub Pages may process standard request logs
under GitHub's terms.

## Contributing and licensing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Source is
licensed under Apache-2.0. The AHAEM and CEXAH names and brand assets are not
licensed for unrelated use; see [NOTICE](NOTICE).

This calculator is informational software, not financial advice.
