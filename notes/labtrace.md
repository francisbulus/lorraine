**App idea: `LabTrace` (wet-lab reproducibility and protocol competency)**

A CLI-first system for biotech/pharma labs that answers: *who can reliably run this protocol right now, with evidence?*

1. **Problem it solves**
- Expensive experiment failures caused by tacit knowledge gaps, not missing SOP docs.

2. **What it models**
- Concepts like `sterile-technique`, `pipette-calibration`, `pcr-control-interpretation`, `contamination-diagnosis`, `sample-chain-of-custody`.

3. **Evidence sources**
- LIMS/instrument logs, QC metrics, run outcomes, peer-reviewed protocol plans, postmortems, targeted probes.

4. **Core commands**
- `labtrace ready --person dana --protocol qpcr-release-panel`
- `labtrace why --person dana --concept contamination-diagnosis`
- `labtrace probe --person dana --concept control-interpretation`
- `labtrace ingest --source lims --since 7d`

5. **Why it is useful**
- Prevents failed runs before they happen.
- Makes shift handoffs safer.
- Surfaces contested/stale knowledge in critical protocols.
- Gives auditable reasoning for who is allowed to run high-cost or high-risk assays.
