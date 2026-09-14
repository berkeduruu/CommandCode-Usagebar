# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected credential leak or security vulnerability. Contact the maintainer privately through the email address on the GitHub profile and include reproduction steps without sending real API keys or session cookies.

## Credential handling

API keys and session cookies must be treated as secrets. The extension stores values entered through its commands in VS Code SecretStorage and sends them only with the API requests required for usage data. Redact credentials from logs, screenshots, issues, and pull requests.
