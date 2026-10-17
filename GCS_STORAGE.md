# Private Google Cloud Storage media

The API writes new uploaded media directly to the private bucket selected by
`GCS_BUCKET_NAME` using Google Application Default Credentials (ADC). It stores
stable application paths such as `/images/<uuid>.png` in the existing database
columns. Express streams these paths from GCS at the same public application
routes, so game clients and admin clients keep their existing URL contract.
Existing local files are served first during the transition. Missing local files
fall through to GCS; missing objects return 404. No object is made public and no
signed URL or credential is stored or returned.

## Local development

Set `GCS_BUCKET_NAME=kido-storage` in the local `.env` and authenticate with
Google Cloud CLI as a developer who has access to the bucket:

```sh
gcloud auth application-default login
gcloud config set project kido-2026
npm run build
```

Without bucket configuration, builds and non-storage tests work. An attempted
upload returns an API error; an attempted remote read responds with 503. No
credential JSON file is needed.

## Cloud Run setup

Set the Cloud Run environment variable `GCS_BUCKET_NAME=kido-storage` on
`kido-api`. Attach a dedicated runtime service account to the service. Grant
that identity the predefined **Storage Object User** role
(`roles/storage.objectUser`) on the `kido-storage` bucket only. This role
supports object create, read, list, and delete operations used by uploads,
streaming delivery, existence checks, and cleanup. If deployment policy needs
finer permissions, the application operations are `storage.objects.create`,
`storage.objects.get`, `storage.objects.list` (not used by request handling),
and `storage.objects.delete`; scope custom grants to this bucket. Keep public
access prevention and uniform bucket-level access enabled. Do not create a
service-account key.

## Existing media migration

Do not rewrite old rows merely because their files are missing on a Cloud Run
instance. Existing files are served locally when available; old rows remain
unchanged. A later, separate migration should be an explicitly invoked script
with dry-run as its default, deterministic/idempotent object names, and a report
of missing files. It should upload and verify each source first, then update
only the matching database row to its stable application URL, and retain the
source file by default. Review the report and take a database backup before
running it. No startup or deployment migration is performed by this backend.

## Deployment and rollback

1. Confirm the bucket IAM grant and `GCS_BUCKET_NAME` on a staging service.
2. Deploy this revision without changing database schema or existing rows.
3. Verify one new image/audio/player/skin/song upload, each app media GET path,
   and a legacy local asset before directing production traffic.
4. To roll back, point Cloud Run traffic to the prior revision. New objects and
   stable application paths remain in the bucket/database; the prior revision
   may not serve them, so retain this revision and bucket data until re-deployed.
5. Do not remove bucket IAM or objects during rollback. No database rollback is
   required because this change has no Prisma migration.

## Limits and operational notes

Image and audio uploads use bounded Multer memory storage (5 MB and 10 MB).
Player and skin forms hold at most two 5 MB images. Song uploads stream to GCS
and retain the 250 MB limit. Failed database writes attempt cleanup of uploaded
objects; failed old-object cleanup is logged for operator retry. Shared URLs
are retained while another supported media/profile record references them.

This repository contains no frontend source. API response media paths retain
their existing form and resolve against the API origin as before; clients do
not need a GCS URL or authorization header for game asset reads.
