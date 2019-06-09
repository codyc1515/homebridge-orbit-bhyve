# homebridge-orbit-bhyve
Orbit B-Hyve Water Timer plugin for [HomeBridge](https://github.com/nfarina/homebridge) using the Wi-Fi Gateway to expose the Valve service to Apple HomeKit.

## Things to know
* Supports only a single water timer
* Requires a Wi-Fi Gateway, but may support BLE (Bluetooth Low Energy) later
* Tested only with the *XXX* adapter, but may support *XXX* adapter

## Getting started

### Supported devices
Orbit B-Hyve Water Timer that is connected to a Wi-Fi gateway

### Setup the app
1. Download, install & setup the *Orbit B-Hyve* app on your mobile device
2. Create a login & add your Orbit B-Hyve Water Timer and Wi-Fi Gateway to the app

### Change your HomeBridge config file
Add the below to the ```accesories``` section of your HomeBridge ```config.json``` file and input your *Orbit B-Hyve* login details in the email & password fields:

```
{
  "accessory": "OrbitBHyve",
  "name": "My B-Hyve Water Timer",
  "email": "your@email.com",
  "password": "yourSECUREpassword"
}
```

### Legal
* Licensed under [MIT](LICENSE)
* This is not an official plug-in and is not affiliated with Orbit in any way
