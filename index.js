const request = require("request");
const WebSocket = require("ws");

var Service, Characteristic, ws;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;

	homebridge.registerAccessory("homebridge-orbit-bhyve", "OrbitBHyve", BHyveValve);
};

function BHyveValve(log, config) {
	this.log = log;
	this.name = config["name"];
	this.email = config["email"];
	this.password = config["password"];
	this.debug = config["debug"] || false;
	this.token, this.user, this.device = null;

	this.value = [];
	this.value.ProgramMode = Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED;
	this.value.InUse = Characteristic.InUse.NOT_IN_USE;
	this.value.SetDuration = 300;
	this.value.RemainingDuration = 0;
	this.value.BatteryLevel = 100;

	// log us in
	request.post({
		url: "https://api.orbitbhyve.com/v1/session",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json",
			"orbit-api-key": "null",
			"orbit-app-id": "Orbit Support Dashboard"
		},
		json: {
			"session": {
				"email": config["email"],
				"password": config["password"]
			}
		},
		rejectUnauthorized: false
	}, function(err, response, body) {
		if (!err && response.statusCode == 200) {
			this.token = body['orbit_api_key'];
			this.user = body['user_id'];

			this.log("Logged into Orbit B-Hyve portal");
		}
		else {this.log("Could not login to Orbit B-Hyve account");}
	}.bind(this));
}

BHyveValve.prototype = {

	identify: function(callback) {
		this.log("identify");
		callback();
	},

	getServices: function() {
		this.IrrigationSystem = new Service.IrrigationSystem(this.name);
		this.IrrigationSystem
			.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
			.setCharacteristic(Characteristic.ProgramMode, Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED)
			.setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
			.setCharacteristic(Characteristic.RemainingDuration, 0);

		this.IrrigationSystem
			.getCharacteristic(Characteristic.Active)
			.on('get', this._getValue.bind(this, "Active_IrrigationSystem"))
			.on('set', this._setValue.bind(this, "Active_IrrigationSystem"));

		this.IrrigationSystem
			.getCharacteristic(Characteristic.ProgramMode)
			.on('get', this._getValue.bind(this, "ProgramMode"));

		this.IrrigationSystem
			.getCharacteristic(Characteristic.InUse)
			.on('get', this._getValue.bind(this, "InUse"))
			.on('set', this._setValue.bind(this, "InUse"));

		this.IrrigationSystem
			.getCharacteristic(Characteristic.RemainingDuration)
			.on('get', this._getValue.bind(this, "RemainingDuration"));

		this.Valve = new Service.Valve(this.name);
		this.Valve
			.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
			.setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
			.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
			.setCharacteristic(Characteristic.SetDuration, 300)
			.setCharacteristic(Characteristic.RemainingDuration, 0)
			.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
			.setCharacteristic(Characteristic.ServiceLabelIndex, 1);

		this.Valve
			.getCharacteristic(Characteristic.Active)
			.on('get', this._getValue.bind(this, "Active_Valve"))
			.on('set', this._setValue.bind(this, "Active_Valve"));

		this.Valve
			.getCharacteristic(Characteristic.InUse)
			.on('get', this._getValue.bind(this, "InUse"))
			.on('set', this._setValue.bind(this, "InUse"));

		this.Valve
			.getCharacteristic(Characteristic.SetDuration)
			.on('get', this._getValue.bind(this, "SetDuration"))
			.on('set', this._setValue.bind(this, "SetDuration"));

		this.Valve
			.getCharacteristic(Characteristic.RemainingDuration)
			.on('get', this._getValue.bind(this, "RemainingDuration"));

		this.IrrigationSystem.addLinkedService(this.Valve);

		this.Battery = new Service.BatteryService(this.name);
		this.Battery
			.setCharacteristic(Characteristic.BatteryLevel, 100)
			.setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGEABLE)
			.setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);

		this.Battery
			.getCharacteristic(Characteristic.BatteryLevel)
			.on('get', this._getValue.bind(this, "BatteryLevel"))
			.on('set', this._setValue.bind(this, "BatteryLevel"));

		this.Valve.addLinkedService(this.Battery);

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Orbit")
			.setCharacteristic(Characteristic.Model, "B-Hyve")
			.setCharacteristic(Characteristic.FirmwareRevision, "1.1.0");
			//.setCharacteristic(Characteristic.SerialNumber, this.name);

		return [this.IrrigationSystem, this.Valve, this.Battery, this.informationService];
	},

	_getValue: function(CharacteristicName, callback) {
		if (this.debug) {this.log("GET", CharacteristicName);}

		switch (CharacteristicName) {
			case "Active_Valve":
				// Get the device details
				request.get({
					url: "https://api.orbitbhyve.com/v1/devices?user_id=" + this.user,
					headers: {
						"Accept": "application/json",
						"orbit-api-key": this.token,
						"orbit-app-id": "Orbit Support Dashboard"
					},
					rejectUnauthorized: false
				}, function(err, response, body) {
					if (!err && response.statusCode == 200) {
						body = JSON.parse(body);
						body.forEach(function(result) {
							if(result['type'] == "sprinkler_timer") {
								this.device = result['id'];

								if(this.debug) {this.log("Found sprinkler '" + this.name + "' with id " + result['id'] + " and state " + result['status']['watering_status']);}

								// Set the Battery Level
								this.value.BatteryLevel = result['battery']['percent'];
								this.Battery.getCharacteristic(Characteristic.BatteryLevel).updateValue(result['battery']['percent']);

								if(result['battery']['percent'] <= 10) {this.Battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);}
								else {this.Battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);}

								// Set the Program Mode
								switch (result['status']['run_mode']) {
									case "auto":
										this.value.ProgramMode = Characteristic.ProgramMode.PROGRAM_SCHEDULED;
										this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED);
									break;

									case "manual":
										this.value.ProgramMode = Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_;
										this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_);
									break;

									case "off":
										this.value.ProgramMode = Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED;
										this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);
									break;
								}

								// If the water is running
								if(result['status']['watering_status']) {
									if(this.debug) {this.log("Water is running in " + result['status']['run_mode'] + " mode");}
									this.value.InUse = Characteristic.InUse.IN_USE;

									// Try / catch statement will catch us when the API is down
									try {
										// Set the current Set Duration
										this.value.SetDuration = result['status']['watering_status']['stations'][0]['run_time'] * 60;

										// Calculate the Remaining Duration
										var time_current = new Date();
										var time_remaining = new Date(result['status']['watering_status']['started_watering_station_at']);
										time_remaining.setSeconds(time_remaining.getSeconds() + (result['status']['watering_status']['stations'][0]['run_time'] * 60));
										this.value.RemainingDuration = Math.round((time_remaining.getTime() - time_current.getTime()) / 1000);
									}
									catch {this.log("Could not find calculate the remaining duration, assuming default duration");}
								}

								// If the water is not running
								else {
									if(this.debug) {this.log("Water is NOT running");}
									this.value.InUse = Characteristic.InUse.NOT_IN_USE;

									// Set the preferred run Duration
									this.value.SetDuration = result['manual_preset_runtime_sec'];
								}
							}
						}.bind(this));
					}
					else {this.log("Could not get Orbit B-Hyve device details");}
				}.bind(this));

				if(this.value.InUse == Characteristic.InUse.IN_USE) {callback(null, Characteristic.Active.ACTIVE);}
				else {callback(null, Characteristic.Active.INACTIVE);}
			break;

			case "Active_IrrigationSystem":
				callback(null, Characteristic.Active.ACTIVE);
			break;

			case "InUse":
				callback(null, this.value.InUse);
			break;

			case "SetDuration":
				callback(null, this.value.SetDuration);
			break;

			case "RemainingDuration":
				callback(null, this.value.RemainingDuration);
			break;

			case "ProgramMode":
				callback(null, this.value.ProgramMode);
			break;

			case "BatteryLevel":
				callback(null, this.value.BatteryLevel);
			break;

			default:
				if(this.debug) {this.log("unknown GET operation called");}
				callback();
			break;
		}
	},

	_setValue: function(CharacteristicName, value, callback) {
		if(this.debug) {this.log("SET", CharacteristicName, value);}

		switch (CharacteristicName) {
			case "Active_Valve":
				var message = "";

				if (value == Characteristic.Active.ACTIVE) {message = '{"event":"change_mode","device_id":"' + this.device + '","stations":[{"station":1,"run_time":' + (this.value.SetDuration / 60) + '}],"mode":"manual"}';}
				else {message = '{"event":"skip_active_station","device_id":"' + this.device + '"}';}

				callback();

				// Load the WebSocket connection
				if(this.debug) {this.log("WS | Connecting to the B-Hyve Events WebSockets API...");}
				ws = new WebSocket("wss://api.orbitbhyve.com/v1/events");

				ws.on('open', function open() {
					if(this.debug) {this.log("WS | Connected");}
					ws.send('{"event":"app_connection","orbit_session_token":"' + this.token + '","subscribe_device_id":"' + this.device + '"}');
					ws.send(message);
				}.bind(this));

				ws.on('message', function incoming(data) {
					if(this.debug) {this.log("WS | Message received: " + data);}
					data = JSON.parse(data);

					switch (data['event']) {
						case "watering_in_progress_notification":
							if(this.debug) {
								this.log("status: active");
								this.log("run_time: " + data['run_time']);
								this.log("program: " + data['program']);
								this.log("current_station: " + data['current_station']);
							}

							this.value.InUse = Characteristic.InUse.IN_USE;
							this.IrrigationSystem.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
							this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);

							this.value.RemainingDuration = this.value.SetDuration;
							this.IrrigationSystem.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.value.SetDuration);
							this.Valve.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.value.SetDuration);
						break;

						case "watering_complete":
							if(this.debug) {this.log("status: inactive");}

							this.value.InUse = Characteristic.InUse.NOT_IN_USE;
							this.IrrigationSystem.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
							this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
						break;

						case "change_mode":
							switch (data['mode']) {
								case "auto":
									if(this.debug) {
										this.log("mode: auto");
										this.log("program: " + data['program']);
										//this.log("station: " + data['stations'][0]['station']);
									}

									this.value.ProgramMode = Characteristic.ProgramMode.PROGRAM_SCHEDULED;
									this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED);
								break;

								case "manual":
									if(this.debug) {
										this.log("mode: manual");
										this.log("program: " + data['program']);
										this.log("station: " + data['stations'][0]['station']);
									}

									this.value.ProgramMode = Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_;
									this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_);
								break;

								case "off":
									if(this.debug) {this.log("mode: off");}

									this.value.ProgramMode = Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED;
									this.Valve.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);
								break;
							}
						break;

						case "clear_low_battery":
							if(this.debug) {this.log("battery: 100%");}
						break;

						default:
							if(this.debug) {this.log("WS | Unknown response");}
						break;
					}
				}.bind(this));

				ws.on('close', function clear() {
					if(this.debug) {this.log("WS | Disconnected");}
				}.bind(this));
			break;

			case "Active_IrrigationSystem":
				callback();
			break;

			case "SetDuration":
				this.value.SetDuration = value;
				callback();
			break;

			default:
				if(this.debug) {this.log("unknown SET operation called");}
				callback();
			break;
		}
	}

};
