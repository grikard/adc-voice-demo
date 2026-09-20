# ADC voice demonstration — customer app

Customer-facing React app for the prepared Libre support demonstration.

- Site: https://grikard.github.io/adc-voice-demo/
- Salesforce channel domain: `grikard.github.io`
- Vite base: `/adc-voice-demo/`

## Build and deployment

Run `npm ci` and `npm run build` with Node 24. The reviewed static artifact is
`dist-pages/`. GitHub Actions builds on pushes to `main` and publishes only this
directory to GitHub Pages. The presenter console and Salesforce backend are not
part of this repository.

## Connect the conversation

The current shell needs the exact Salesforce-generated Enhanced Chat v2
deployment snippet inserted at `SALESFORCE_DEPLOYMENT_SNIPPET` in `index.html`.
Configure the dedicated channel for `grikard.github.io`, enable Agentforce Voice,
publish its deployment, insert the snippet, and rebuild. Never insert Salesforce
session tokens, CLI authentication files, or administrative credentials.

The app launches Salesforce's native conversation interface; it does not itself
start microphone capture. Until the messaging deployment is connected, support
is shown as unavailable. Hosting success is not proof of working two-way voice.

This app uses a prepared demonstration profile and simulated device events.
