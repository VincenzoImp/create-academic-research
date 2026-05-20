# Scripts

Use this folder for thin, repeatable command entrypoints.

Scripts should orchestrate project code, not contain core scientific logic. Put
reusable methods, models, data transforms, and analysis functions in `src/`.

Each script should make its inputs, outputs, config path, and expected side
effects clear enough to reproduce later from `docs/reproducibility/` or an
experiment record.
