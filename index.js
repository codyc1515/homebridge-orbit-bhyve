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
	this.value.Active = 0;
	this.value.InUse = 0;
	this.value.SetDuration = 300;
	this.value.RemainingDuration = 0;
	
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
			
			if(this.debug) {this.log(this.token, this.user);}
			this.log("Logged into Orbit B-Hyve portal");
			
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
							this.name = result['name'];
							
							if(this.debug) {this.log("Found sprinkler '" + this.name + "' with id " + result['id']);}
							
							if(!result['status']['watering_status']) {
								if(this.debug) {this.log("Water is NOT running");}
								
								this.value.SetDuration = result['manual_preset_runtime_sec'];
								
								this.value.Active = 0;
								this.value.InUse = 0;
							}
							else {
								this.value.SetDuration = result['status']['watering_status']['stations'][0]['run_time'] * 60;
								
								var tempRemainingDuration = new Date(result['status']['watering_status']['started_watering_station_at']);
								tempRemainingDuration = tempRemainingDuration.setMinutes(tempRemainingDuration.getMinutes() + (this.value.SetDuration / 60));
								this.value.RemainingDuration = Math.round((tempRemainingDuration - new Date().getTime()) / 10 / 60);
								
								switch (result['status']['run_mode']) {
									case "manual":
										if(this.debug) {this.log("Water is running MANUAL for another " + this.value.RemainingDuration + " secs (of " + this.value.SetDuration + ")");}
										
										this.value.Active = 1;
										this.value.InUse = 1;
									break;
									
									default:
										if(this.debug) {this.log("Water state is UNKNOWN");}
										
										this.value.Active = 0;
										this.value.InUse = 0;
									break;
								}
							}
						}
					}.bind(this));
				}
				else {this.log("Could not get Orbit B-Hyve device details");}
			}.bind(this));
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
		this.Valve = new Service.Valve(this.name);
		this.Valve
			.setCharacteristic(Characteristic.SetDuration, 300)
			.setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
			.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
			.setCharacteristic(Characteristic.ProgramMode, Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);
			
		this.Valve
			.getCharacteristic(Characteristic.Active)
			.on('get', this._getValue.bind(this, "Active"))
			.on('set', this._setValue.bind(this, "Active"));
			
		this.Valve
			.getCharacteristic(Characteristic.InUse)
			.on('get', this._getValue.bind(this, "InUse"))
			.on('set', this._setValue.bind(this, "InUse"));
			
		this.Valve
			.getCharacteristic(Characteristic.ProgramMode)
			.on('get', this._getValue.bind(this, "ProgramMode"))
			.on('set', this._setValue.bind(this, "ProgramMode"));
			
		this.Valve
			.getCharacteristic(Characteristic.SetDuration)
			.on('get', this._getValue.bind(this, "SetDuration"))
			.on('set', this._setValue.bind(this, "SetDuration"));
			
		this.Valve
			.getCharacteristic(Characteristic.RemainingDuration)
			.on('get', this._getValue.bind(this, "RemainingDuration"))
			.on('set', this._setValue.bind(this, "RemainingDuration"));
			
		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, "Orbit")
			.setCharacteristic(Characteristic.Model, "B-Hyve")
			.setCharacteristic(Characteristic.FirmwareRevision, "1.0.0");
			//.setCharacteristic(Characteristic.SerialNumber, this.name);
			
		return [this.Valve, this.informationService];
	},
	
	_getValue: function(CharacteristicName, callback) {
		if (this.debug) {
			this.log("GET", CharacteristicName);
		}
		
		switch (CharacteristicName) {
			case "Active":
				if(this.value.Active == 1) {callback(null, Characteristic.Active.ACTIVE);}
				else {callback(null, Characteristic.Active.INACTIVE);}
			break;
			
			case "InUse":
				if(this.value.InUse == 1) {callback(null, Characteristic.InUse.IN_USE);}
				else {callback(null, Characteristic.InUse.NOT_IN_USE);}
			break;
			
			case "SetDuration":
				callback(null, this.value.SetDuration);
			break;
			
			case "RemainingDuration":
				callback(null, this.value.RemainingDuration);
			break;
			
			case "ProgramMode":
				callback(null, Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);
			break;
		}
	},
	
	_setValue: function(CharacteristicName, value, callback) {
		if(this.debug) {this.log("SET", CharacteristicName, value);}
		
		var message = "";
		
		switch (CharacteristicName) {
			case "Active":
				if (value == Characteristic.Active.ACTIVE) {message = '{"event":"change_mode","device_id":"' + this.device + '","stations":[{"station":1,"run_time":' + (this.value.SetDuration / 60) + '}],"mode":"manual"}';}
				else {message = '{"event":"skip_active_station","device_id":"' + this.device + '"}';}
			break;
			
			case "SetDuration":
				callback();
			break;
			
			case "ProgramMode":
				callback();
			break;
			
			default:
				callback();
				if(this.debug) {this.log("unknown SET operation called");}
			break;
		}
		
		if(message !== "") {
			// Load the WebSocket connection
			if(this.debug) {this.log("WS | Connecting to the B-Hyve Events WebSockets API...");}
			ws = new WebSocket("wss://api.orbitbhyve.com/v1/events");
			
			ws.on('open', function open() {
				if(this.debug) {this.log("WS | Connected");}
				ws.send('{"event":"app_connection","orbit_session_token":"' + this.token + '","subscribe_device_id":"' + this.device + '"}');
				ws.send(message);
			}.bind(this));
			
			ws.on('message', function incoming(data) {
				//this.log("WS | Message received: " + data);
				data = JSON.parse(data);
				
				switch (data['event']) {
					case "watering_in_progress_notification":
						if(this.debug) {
							this.log("status: active");
							this.log("run_time: " + data['run_time']);
							//this.log("program: " + data['program']);
							//this.log("current_station: " + data['current_station']);
						}
						
						this.value.InUse = 1;
						this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
						
						//callback();
					break;
					
					case "watering_complete":
						if(this.debug) {this.log("status: inactive");}
						
						this.value.InUse = 0;
						this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
						
						//callback();
					break;
					
					case "change_mode":
						switch (data['mode']) {
							case "auto":
								if(this.debug) {this.log("mode: auto");}
								//this.log("program: " + data['program']);
								//this.log("station: " + data['stations'][0]['station']);
								
								this.value.Active = 1;
								this.value.InUse = 1;
								this.Valve.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
								this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
								
								callback();
							break;
							
							case "manual":
								if(this.debug) {this.log("mode: manual");}
								//this.log("program: " + data['program']);
								//this.log("station: " + data['stations'][0]['station']);
								
								this.value.Active = 1;
								this.value.InUse = 1;
								this.Valve.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
								this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
								
								callback();
							break;
							
							case "off":
								if(this.debug) {this.log("mode: off");}
								
								this.value.Active = 0;
								this.value.InUse = 0;
								this.Valve.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
								this.Valve.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
								
								callback();
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
		}
	}

};
