# ADC voice demonstration — customer app

Customer-facing React app for the prepared Libre support demonstration.

- Site: https://grikard.github.io/adc-voice-demo/
- Salesforce channel domain: `grikard.github.io`
- Vite base: `/adc-voice-demo/`

## Build and deployment

Run `npm ci`, `npm test` and `npm run build` with Node 24. The reviewed static artifact is
`dist-pages/`. GitHub Actions builds on pushes to `main` and publishes only this
directory to GitHub Pages. The presenter console and Salesforce backend are not
part of this repository.

## Connect the conversation

The supplied Salesforce-generated ADC_Customer_Support deployment is integrated
in `src/messaging.js`, preserving its exact public connection values and en_US.
A page-wide singleton loads and initializes the bootstrap once. Buttons wait for
onEmbeddedMessagingButtonCreated; script/init failures or a 30-second readiness
timeout show a connection error. Reload the page to retry. Never insert Salesforce
session tokens, CLI authentication files, or administrative credentials.

The app launches Salesforce's native conversation interface; it does not itself
start microphone capture. The custom button calls the supported launchChat(true)
API. Hosting or widget-loading success is not proof of working two-way voice.

This app uses a prepared demonstration profile and simulated device events.
