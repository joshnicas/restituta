# Admin media integration contract

The admin sends media to the existing backend using multipart `FormData`:

| Resource | Endpoint | File field | Backend limit |
| --- | --- | --- | --- |
| Image | `POST /images`, replacement via `PUT /images/:id` | `image` | image MIME, 5 MB |
| Audio | `POST /audios` | `audio` | audio MIME, 10 MB |
| Song | `POST /songs`, replacement via `PUT /songs/:id` | `media` | audio/video MIME, 250 MB |

The browser must let Angular set multipart `Content-Type` with its boundary.
The current admin has no player or skin management screens.

The API should keep returning media references in existing resource fields
(`url`, `url1`, `url2`). Relative paths such as `/images/<name>` and
`/songs/<name>` resolve against the configured API origin. Absolute HTTP(S)
URLs are used as returned, so the admin remains compatible with a backend that
returns temporary signed URLs in the future. The admin does not generate bucket
URLs, persist media URLs independently, or upload directly to GCS.

For private bucket objects, the backend must deliver these references through
its application origin (or return a valid short-lived signed URL at response
time). Existing API responses and preview URLs are not cached by the admin
beyond the component data currently loaded. An API route that requires an
Authorization header cannot be loaded by a plain `<img>`, `<audio>`, or `<video>`
element; previews therefore depend on the backend app media paths being
browser-readable or on signed URLs. No new endpoint is assumed here.
