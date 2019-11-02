const request = require("request");
const WebSocket = require("ws");

var Service,
    Characteristic,
    ws;

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
    this.zones = config["zones"] || 1;
    this.debug = config["debug"] || false;
    this.token, this.user, this.device = null;

    this.BatteryLevel = 100;

    this.Valves = [];

    this.Valves[0] = [];
    this.Valves[0]['Active'] = Characteristic.Active.ACTIVE;
    this.Valves[0]['InUse'] = Characteristic.InUse.NOT_IN_USE;
    this.Valves[0]['RemainingDuration'] = 0;
    this.Valves[0]['ProgramMode'] = Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED;

    this.Valves[1] = [];
    this.Valves[1]['Active'] = Characteristic.Active.INACTIVE;
    this.Valves[1]['InUse'] = Characteristic.InUse.NOT_IN_USE;
    this.Valves[1]['SetDuration'] = 300;
    this.Valves[1]['RemainingDuration'] = 0;

    this.Valves[2] = [];
    this.Valves[2]['Active'] = Characteristic.Active.INACTIVE;
    this.Valves[2]['InUse'] = Characteristic.InUse.NOT_IN_USE;
    this.Valves[2]['SetDuration'] = 300;
    this.Valves[2]['RemainingDuration'] = 0;

    this.Valves[3] = [];
    this.Valves[3]['Active'] = Characteristic.Active.INACTIVE;
    this.Valves[3]['InUse'] = Characteristic.InUse.NOT_IN_USE;
    this.Valves[3]['SetDuration'] = 300;
    this.Valves[3]['RemainingDuration'] = 0;

    this.Valves[4] = [];
    this.Valves[4]['Active'] = Characteristic.Active.INACTIVE;
    this.Valves[4]['InUse'] = Characteristic.InUse.NOT_IN_USE;
    this.Valves[4]['SetDuration'] = 300;
    this.Valves[4]['RemainingDuration'] = 0;

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
                "email": this.email,
                "password": this.password
            }
        },
        timeout: 2000
    }, function(err, response, body) {
        if (!err && response.statusCode == 200) {
            this.token = body['orbit_api_key'];
            this.user = body['user_id'];

            this.log("Logged into Orbit B-Hyve");
        }
        else {this.log("Failed to login to Orbit B-Hyve");}
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
            .setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
            .setCharacteristic(Characteristic.RemainingDuration, 0)
            .setCharacteristic(Characteristic.ProgramMode, Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);

        this.IrrigationSystem
            .getCharacteristic(Characteristic.Active)
            .on('get', this._getValue.bind(this, "Active_IrrigationSystem", 0))
            .on('set', this._setValue.bind(this, "Active_IrrigationSystem", 0));

        this.IrrigationSystem
            .getCharacteristic(Characteristic.ProgramMode)
            .on('get', this._getValue.bind(this, "ProgramMode", 0));

        this.IrrigationSystem
            .getCharacteristic(Characteristic.InUse)
            .on('get', this._getValue.bind(this, "InUse", 0))
            .on('set', this._setValue.bind(this, "InUse", 0));

        this.IrrigationSystem
            .getCharacteristic(Characteristic.RemainingDuration)
            .on('get', this._getValue.bind(this, "RemainingDuration", 0));


        this.Battery = new Service.BatteryService(this.name);
        this.Battery
            .setCharacteristic(Characteristic.BatteryLevel, 100)
            .setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGEABLE)
            .setCharacteristic(Characteristic.StatusLowBattery, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);

        this.Battery
            .getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this._getValue.bind(this, "BatteryLevel", null))
            .on('set', this._setValue.bind(this, "BatteryLevel", null));

        this.IrrigationSystem.addLinkedService(this.Battery);


        this.Valve1 = new Service.Valve(this.name, 1);
        this.Valve1
            .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
            .setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
            .setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
            .setCharacteristic(Characteristic.SetDuration, 300)
            .setCharacteristic(Characteristic.RemainingDuration, 0)
            .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
            .setCharacteristic(Characteristic.ServiceLabelIndex, 1);

        this.Valve1
            .getCharacteristic(Characteristic.Active)
            .on('get', this._getValue.bind(this, "Active_Valve", 1))
            .on('set', this._setValue.bind(this, "Active_Valve", 1));

        this.Valve1
            .getCharacteristic(Characteristic.InUse)
            .on('get', this._getValue.bind(this, "InUse", 1))
            .on('set', this._setValue.bind(this, "InUse", 1));

        this.Valve1
            .getCharacteristic(Characteristic.SetDuration)
            .on('get', this._getValue.bind(this, "SetDuration", 1))
            .on('set', this._setValue.bind(this, "SetDuration", 1));

        this.Valve1
            .getCharacteristic(Characteristic.RemainingDuration)
            .on('get', this._getValue.bind(this, "RemainingDuration", 1));

        this.IrrigationSystem.addLinkedService(this.Valve1);


        this.informationService = new Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(Characteristic.Name, this.name)
            .setCharacteristic(Characteristic.Manufacturer, "Orbit")
            .setCharacteristic(Characteristic.Model, "B-Hyve")
            .setCharacteristic(Characteristic.FirmwareRevision, "1.1.0");
            //.setCharacteristic(Characteristic.SerialNumber, this.name);

        if(this.zones >= 2) {
            this.Valve2 = new Service.Valve(this.name, 2);
            this.Valve2
                .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
                .setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
                .setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
                .setCharacteristic(Characteristic.SetDuration, 300)
                .setCharacteristic(Characteristic.RemainingDuration, 0)
                .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(Characteristic.ServiceLabelIndex, 2);

            this.Valve2
                .getCharacteristic(Characteristic.Active)
                .on('get', this._getValue.bind(this, "Active_Valve", 2))
                .on('set', this._setValue.bind(this, "Active_Valve", 2));

            this.Valve2
                .getCharacteristic(Characteristic.InUse)
                .on('get', this._getValue.bind(this, "InUse", 2))
                .on('set', this._setValue.bind(this, "InUse", 2));

            this.Valve2
                .getCharacteristic(Characteristic.SetDuration)
                .on('get', this._getValue.bind(this, "SetDuration", 2))
                .on('set', this._setValue.bind(this, "SetDuration", 2));

            this.Valve2
                .getCharacteristic(Characteristic.RemainingDuration)
                .on('get', this._getValue.bind(this, "RemainingDuration", 2));

            this.IrrigationSystem.addLinkedService(this.Valve2);
        }

        if(this.zones >= 3) {
            this.Valve3 = new Service.Valve(this.name, 3);
            this.Valve3
                .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
                .setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
                .setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
                .setCharacteristic(Characteristic.SetDuration, 300)
                .setCharacteristic(Characteristic.RemainingDuration, 0)
                .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(Characteristic.ServiceLabelIndex, 3);

            this.Valve3
                .getCharacteristic(Characteristic.Active)
                .on('get', this._getValue.bind(this, "Active_Valve", 3))
                .on('set', this._setValue.bind(this, "Active_Valve", 3));

            this.Valve3
                .getCharacteristic(Characteristic.InUse)
                .on('get', this._getValue.bind(this, "InUse", 3))
                .on('set', this._setValue.bind(this, "InUse", 3));

            this.Valve3
                .getCharacteristic(Characteristic.SetDuration)
                .on('get', this._getValue.bind(this, "SetDuration", 3))
                .on('set', this._setValue.bind(this, "SetDuration", 3));

            this.Valve3
                .getCharacteristic(Characteristic.RemainingDuration)
                .on('get', this._getValue.bind(this, "RemainingDuration", 3));

            this.IrrigationSystem.addLinkedService(this.Valve3);
        }

        if(this.zones >= 4) {
            this.Valve4 = new Service.Valve(this.name, 4);
            this.Valve4
                .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
                .setCharacteristic(Characteristic.InUse, Characteristic.InUse.NOT_IN_USE)
                .setCharacteristic(Characteristic.ValveType, Characteristic.ValveType.IRRIGATION)
                .setCharacteristic(Characteristic.SetDuration, 300)
                .setCharacteristic(Characteristic.RemainingDuration, 0)
                .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(Characteristic.ServiceLabelIndex, 4);

            this.Valve4
                .getCharacteristic(Characteristic.Active)
                .on('get', this._getValue.bind(this, "Active_Valve", 4))
                .on('set', this._setValue.bind(this, "Active_Valve", 4));

            this.Valve4
                .getCharacteristic(Characteristic.InUse)
                .on('get', this._getValue.bind(this, "InUse", 4))
                .on('set', this._setValue.bind(this, "InUse", 4));

            this.Valve4
                .getCharacteristic(Characteristic.SetDuration)
                .on('get', this._getValue.bind(this, "SetDuration", 4))
                .on('set', this._setValue.bind(this, "SetDuration", 4));

            this.Valve4
                .getCharacteristic(Characteristic.RemainingDuration)
                .on('get', this._getValue.bind(this, "RemainingDuration", 4));

            this.IrrigationSystem.addLinkedService(this.Valve4);
        }

        if(this.zones >= 4) {
            return [
                this.IrrigationSystem,
                this.Battery,
                this.Valve1,
                this.Valve2,
                this.Valve3,
                this.Valve4,
                this.informationService
            ];
        }
        else if(this.zones >= 3) {
            return [
                this.IrrigationSystem,
                this.Battery,
                this.Valve1,
                this.Valve2,
                this.Valve3,
                this.informationService
            ];
        }
        else if(this.zones >= 2) {
            return [
                this.IrrigationSystem,
                this.Battery,
                this.Valve1,
                this.Valve2,
                this.informationService
            ];
        }
        else {
            return [
                this.IrrigationSystem,
                this.Battery,
                this.Valve1,
                this.informationService
            ];
        }
    },

    _getValue: function(CharacteristicName, stationId, callback) {
        if(this.debug) {this.log("GET Station", stationId, CharacteristicName);}

        switch (CharacteristicName) {

            case "Active_IrrigationSystem":
                // Get the device details
                request.get({
                    url: "https://api.orbitbhyve.com/v1/devices?user_id=" + this.user,
                    headers: {
                        "Accept": "application/json",
                        "orbit-api-key": this.token,
                        "orbit-app-id": "Orbit Support Dashboard"
                    },
                    timeout: 2000
                }, function(err, response, body) {
                if (!err && response.statusCode == 200) {
                    body = JSON.parse(body);
                    body.forEach(function(result) {
                        if(result['type'] == "sprinkler_timer") {
                            this.device = result['id'];

                            if(this.debug) {this.log("Found sprinkler '" + this.name + "' with id " + result['id'] + " and state " + result['status']['watering_status']);}

                            // Check if the device is connected
                            if(result['is_connected'] == true) {this.IrrigationSystem.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT);}
                            else {this.IrrigationSystem.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT);}

                            // Set the Battery Level
                            if(result['battery']) {
                                this.BatteryLevel = result['battery']['percent'];
                                this.Battery.getCharacteristic(Characteristic.BatteryLevel).updateValue(result['battery']['percent']);

                                if(result['battery']['percent'] <= 10) {this.Battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);}
                                else {this.Battery.getCharacteristic(Characteristic.StatusLowBattery).updateValue(Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);}
                            }
                            else {
                                if(this.debug) {this.log("No battery service available");}

                                this.Battery.setHiddenService(true);
                            }

                            // Set the Program Mode
                            switch (result['status']['run_mode']) {
                                case "auto":
                                    this.Valves[0]['ProgramMode'] = Characteristic.ProgramMode.PROGRAM_SCHEDULED;
                                    this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED);
                                break;

                                case "manual":
                                    this.Valves[0]['ProgramMode'] = Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_;
                                    this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_);
                                break;

                                case "off":
                                    this.Valves[0]['ProgramMode'] = Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED;
                                    this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED);
                                break;
                            }

                            // If the water is running
                            if(result['status']['watering_status']) {
                                if(this.debug) {this.log("Water is running in " + result['status']['run_mode'] + " mode");}

                                // Try / catch statement will catch us when the API is down
                                try {
                                    // Calculate the RemainingDuration & SetDuration
                                    var time_current = new Date();
                                    var time_remaining = new Date(result['status']['watering_status']['started_watering_station_at']);
                                    time_remaining.setSeconds(time_remaining.getSeconds() + (result['status']['watering_status']['stations'][0]['run_time'] * 60));

                                    var tempSetDuration = result['status']['watering_status']['stations'][0]['run_time'] * 60;
                                    var tempRemainingDuration = Math.round((time_remaining.getTime() - time_current.getTime()) / 1000);

                                    this.Valves[1]['Active'] = Characteristic.Active.INACTIVE;
                                    this.Valves[2]['Active'] = Characteristic.Active.INACTIVE;
                                    this.Valves[3]['Active'] = Characteristic.Active.INACTIVE;
                                    this.Valves[4]['Active'] = Characteristic.Active.INACTIVE;

                                    this.Valves[1]['InUse'] = Characteristic.InUse.NOT_IN_USE;
                                    this.Valves[2]['InUse'] = Characteristic.InUse.NOT_IN_USE;
                                    this.Valves[3]['InUse'] = Characteristic.InUse.NOT_IN_USE;
                                    this.Valves[4]['InUse'] = Characteristic.InUse.NOT_IN_USE;

                                    this.Valves[1]['RemainingDuration'] = 0;
                                    this.Valves[2]['RemainingDuration'] = 0;
                                    this.Valves[3]['RemainingDuration'] = 0;
                                    this.Valves[4]['RemainingDuration'] = 0;

                                    this.Valves[result['status']['watering_status']['stations'][0]['station']]['Active'] = Characteristic.Active.ACTIVE;
                                    this.Valves[result['status']['watering_status']['stations'][0]['station']]['InUse'] = Characteristic.InUse.IN_USE;
                                    this.Valves[result['status']['watering_status']['stations'][0]['station']]['SetDuration'] = tempSetDuration;
                                    this.Valves[result['status']['watering_status']['stations'][0]['station']]['RemainingDuration'] = tempRemainingDuration;

                                    this.Valve1.getCharacteristic(Characteristic.Active).updateValue(this.Valves[1]['Active']);
                                    if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.Active).updateValue(this.Valves[2]['Active']);}
                                    if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.Active).updateValue(this.Valves[3]['Active']);}
                                    if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.Active).updateValue(this.Valves[4]['Active']);}

                                    this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(this.Valves[1]['InUse']);
                                    if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(this.Valves[2]['InUse']);}
                                    if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(this.Valves[3]['InUse']);}
                                    if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(this.Valves[4]['InUse']);}

                                    this.Valve1.getCharacteristic(Characteristic.SetDuration).updateValue(this.Valves[1]['SetDuration']);
                                    if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.SetDuration).updateValue(this.Valves[2]['SetDuration']);}
                                    if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.SetDuration).updateValue(this.Valves[3]['SetDuration']);}
                                    if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.SetDuration).updateValue(this.Valves[4]['SetDuration']);}

                                    this.Valve1.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.Valves[1]['RemainingDuration']);
                                    if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.Valves[2]['RemainingDuration']);}
                                    if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.Valves[3]['RemainingDuration']);}
                                    if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.Valves[4]['RemainingDuration']);}
                                }
                                catch(err) {
                                    if(this.debug) {this.log("Could not find calculate the remaining duration, assuming default duration");}
                                }
                            }

                            // If the water is not running
                            else {
                                if(this.debug) {this.log("Water is NOT running");}

                                this.Valves[1].InUse = Characteristic.InUse.NOT_IN_USE;
                                this.Valves[2].InUse = Characteristic.InUse.NOT_IN_USE;
                                this.Valves[3].InUse = Characteristic.InUse.NOT_IN_USE;
                                this.Valves[4].InUse = Characteristic.InUse.NOT_IN_USE;

                                this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}
                                if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}

                                // Set the preferred run Duration
                                if(result['manual_preset_runtime_sec'] != 0) {
                                    this.Valves[1].SetDuration = result['manual_preset_runtime_sec'];
                                    this.Valves[2].SetDuration = result['manual_preset_runtime_sec'];
                                    this.Valves[3].SetDuration = result['manual_preset_runtime_sec'];
                                    this.Valves[4].SetDuration = result['manual_preset_runtime_sec'];

                                    this.Valve1.getCharacteristic(Characteristic.SetDuration).updateValue(result['manual_preset_runtime_sec']);
                                    if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.SetDuration).updateValue(result['manual_preset_runtime_sec']);}
                                    if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.SetDuration).updateValue(result['manual_preset_runtime_sec']);}
                                    if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.SetDuration).updateValue(result['manual_preset_runtime_sec']);}
                                }
                                else if(this.debug) {this.log("Unknown preset runtime, leaving default of 5 minutes");}
                            }
                        }
                    }.bind(this));
                    }
                    else {this.log("Could not get Orbit B-Hyve device details");}
                }.bind(this));

                callback(null, Characteristic.Active.ACTIVE);
            break;

            case "Active_Valve":        callback(null, this.Valves[stationId]['Active']);               break;
            case "InUse":               callback(null, this.Valves[stationId]['InUse']);                break;
            case "SetDuration":         callback(null, this.Valves[stationId]['SetDuration']);          break;
            case "RemainingDuration":   callback(null, this.Valves[stationId]['RemainingDuration']);    break;
            case "ProgramMode":         callback(null, this.Valves[0]['ProgramMode']);                  break;
            case "BatteryLevel":        callback(null, this.BatteryLevel);                              break;

            default:
                this.log("Unknown CharacteristicName called", CharacteristicName);
                callback();
            break;
        }
    },

    _setValue: function(CharacteristicName, stationId, value, callback) {
        if(this.debug) {this.log("SET", CharacteristicName, "Value", value, "Station", stationId);}

        switch (CharacteristicName) {

            case "Active_IrrigationSystem":
                callback();
            break;

            case "Active_Valve":
                var message = "";

                if (value == Characteristic.Active.ACTIVE) {message = '{"event":"change_mode","device_id":"' + this.device + '","stations":[{"station":' + stationId + ',"run_time":' + (this.Valves[stationId]['SetDuration'] / 60) + '}],"mode":"manual"}';}
                else {message = '{"event":"skip_active_station","device_id":"' + this.device + '"}';}

                callback();

                // Load the WebSocket connection
                if(this.debug) {this.log("WS | Connecting to the B-Hyve Events WebSockets API...");}
                ws = new WebSocket("wss://api.orbitbhyve.com/v1/events");

                ws.on('open', function open() {
                    if(this.debug) {this.log("WS | Connected");}
                    ws.send('{"event":"app_connection","orbit_session_token":"' + this.token + '","subscribe_device_id":"' + this.device + '"}');
                    ws.send(message);
                    if(this.debug) {this.log("WS | Message sent: ", message);}
                }.bind(this));

                ws.on('message', function incoming(data) {
                if(this.debug) {this.log("WS | Message received: " + data);}
                data = JSON.parse(data);

                switch (data['event']) {
                    case "watering_in_progress_notification":
                        if(this.debug) {this.log("WS | watering_in_progress_notification Station", data['current_station'], "Runtime", data['run_time']);}

                        this.IrrigationSystem.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
                        this.IrrigationSystem.getCharacteristic(Characteristic.RemainingDuration).updateValue(data['run_time'] * 60);

                        switch (data['current_station']) {
                            case 1:
                                this.Valves[1]['InUse'] = Characteristic.InUse.IN_USE;
                                this.Valves[1]['RemainingDuration'] = data['run_time'] * 60;

                                this.Valve1.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
                                if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}
                                if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}

                                this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
                                if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}
                                if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}

                                this.Valve1.getCharacteristic(Characteristic.RemainingDuration).updateValue(data['run_time'] * 60);
                            break;

                            case 2:
                                this.Valves[2]['InUse'] = Characteristic.InUse.IN_USE;
                                this.Valves[2]['RemainingDuration'] = data['run_time'] * 60;

                                this.Valve1.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve2.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
                                if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}

                                this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
                                if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}

                                this.Valve2.getCharacteristic(Characteristic.RemainingDuration).updateValue(data['run_time'] * 60);
                            break;

                            case 3:
                                this.Valves[3]['InUse'] = Characteristic.InUse.IN_USE;
                                this.Valves[3]['RemainingDuration'] = data['run_time'] * 60;

                                this.Valve1.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve2.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve3.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);}

                                this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);
                                if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);}

                                this.Valve3.getCharacteristic(Characteristic.RemainingDuration).updateValue(data['run_time'] * 60);
                            break;

                            case 4:
                                this.Valves[4]['InUse'] = Characteristic.InUse.IN_USE;
                                this.Valves[4]['RemainingDuration'] = data['run_time'] * 60;

                                this.Valve1.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve2.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve3.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
                                this.Valve4.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.ACTIVE);

                                this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);
                                this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.IN_USE);

                                this.Valve4.getCharacteristic(Characteristic.RemainingDuration).updateValue(data['run_time'] * 60);
                            break;
                        }
                    break;

                    case "watering_complete":
                        if(this.debug) {this.log("WS | watering_complete");}

                        this.IrrigationSystem.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);

                        switch (stationId) {
                            case 1: this.Valve1.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE); break;
                            case 2: if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);} break;
                            case 3: if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);} break;
                            case 4: if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.InUse).updateValue(Characteristic.InUse.NOT_IN_USE);} break;
                        }
                    break;

                    case "change_mode":
                        if(this.debug) {this.log("WS | change_mode");}

                        switch (data['mode']) {
                            case "auto": this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED); break;
                            case "manual": this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.PROGRAM_SCHEDULED_MANUAL_MODE_); break;
                            case "off": this.IrrigationSystem.getCharacteristic(Characteristic.ProgramMode).updateValue(Characteristic.ProgramMode.NO_PROGRAM_SCHEDULED); break;
                        }
                    break;

                    case "clear_low_battery":
                        if(this.debug) {this.log("WS | clear_low_battery");}
                    break;

                    default:
                        this.log("WS | Unknown WS message received");
                    break;
                    }
                }.bind(this));

                ws.on('close', function clear() {
                    if(this.debug) {this.log("WS | Disconnected");}
                }.bind(this));
            break;

            case "SetDuration":
                switch (stationId) {
                    case 1: this.Valve1.getCharacteristic(Characteristic.SetDuration).updateValue(value); break;
                    case 2: if(this.zones >= 2) {this.Valve2.getCharacteristic(Characteristic.SetDuration).updateValue(value);} break;
                    case 3: if(this.zones >= 3) {this.Valve3.getCharacteristic(Characteristic.SetDuration).updateValue(value);} break;
                    case 4: if(this.zones >= 4) {this.Valve4.getCharacteristic(Characteristic.SetDuration).updateValue(value);} break;
                    default:
                        this.log("Unknown station called for SetDuration", stationId);
                        callback(null);
                    break;
                }

                callback();
            break;

            default:
                this.log("Unknown CharacteristicName called", CharacteristicName);
                callback();
            break;
        }
    }

};
