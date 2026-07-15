# Studium Bifrost runtime

This directory contains only Studium-owned configuration inputs for the locked Bifrost sidecar. It does not vendor Bifrost source or binaries.

- `runtime-lock.json` pins the official Bifrost HTTP transport artifact used by the current Windows x64 local baseline.
- `catalog/` contains deliberately empty pricing, model-parameter, and MCP library files so the gateway does not fetch those catalogs from unrelated external services. The launcher serves the empty MCP catalog on a loopback-only helper endpoint because Bifrost v1.6.3 cannot read a Windows absolute `file://` MCP catalog correctly.
- `scripts/bifrost.mjs` downloads, verifies, configures, and starts the sidecar under the ignored `runtime/bifrost/` directory.

The launcher accepts an OpenAI-compatible upstream only as an HTTPS origin through `STUDIUM_UPSTREAM_BASE_URL`. Do not include `/v1`; Bifrost appends the API path itself.

The recorded executable hash is a Studium-observed integrity lock, not an upstream signature: Bifrost v1.6.3 does not publish a checksum file and its Windows executable is not Authenticode-signed. Updating the transport requires a fresh source, release, artifact, license, and integrity review.
