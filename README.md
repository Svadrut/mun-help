# Rubric Grader

Grade a zip of student PDFs against a rubric and download the grades as a CSV.

1. Paste or upload the rubric. The model turns it into criteria you can edit.
2. Drop a zip of PDFs. Each one is sent to the model, which finds the student's name and scores every criterion.
3. Check flagged rows (missing or duplicate names, blank pages, etc.), fix anything by hand, and download the CSV.

There's no database or login. The batch, including the PDFs, is saved in your browser's IndexedDB, so closing the tab doesn't lose progress. "New batch" clears it.

## Running it

```sh
cp .env.example .env.local   # add OPENAI_API_KEY
bun install
bun run dev
```

| Variable | |
| --- | --- |
| `OPENAI_API_KEY` | Required |
| `OPENAI_MODEL` | Defaults to `gpt-6-luna` |
| `APP_PASSWORD` | If set, the site asks for it before calling the API. Set this on any public deployment. |

## Deploying to Vercel

Import the repo and set the env vars above. Vercel rejects request bodies over 4.5 MB, so a PDF larger than that fails with a message saying so. Run locally for batches of big scans.
