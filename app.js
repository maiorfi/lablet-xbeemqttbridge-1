var util = require('util');
var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var mqtt = require('mqtt');

var C = xbee_api.constants;

var portaSeriale = new SerialPort('COM15', {
  baudRate: 115200
});

var clientMqtt = mqtt.connect({
  protocol: 'mqtt',
  host: 'localhost',
  port: 1883
});

var xbeeAPI = new xbee_api.XBeeAPI();

clientMqtt.on('connect', function() {
  console.log('Connessione a broker MQTT OK');

  clientMqtt.subscribe('/unipg/zigbee-mqtt-bridge/mqtt-rx/#');
});

portaSeriale.on('data', function(data) {
  xbeeAPI.parseRaw(data);
});

xbeeAPI.on('frame_object', function(frame) {
  //console.log(frame);

  switch (frame.type) {
    case C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET:
      console.log(
        'Ricevuto via ZigBee (da %s): %s',
        frame.remote64,
        frame.data
      );
      pubblicaViaMqtt(frame.remote64, frame.data.toString());
      break;
    case C.FRAME_TYPE.ZIGBEE_TRANSMIT_STATUS:
      console.log(
        'Esito trasmissione ZigBee (frame %d): %s',
        frame.id,
        frame.deliveryStatus === 0 ? 'OK' : frame.deliveryStatus.toString()
      );
      pubblicaEsitoTxViaMqtt(frame.id, frame.deliveryStatus);
      break;
  }
});

clientMqtt.on('message', function(topic, payload) {
  console.log('Ricevuto via MQTT: %s, %s', topic, payload.toString());
  pubblicaViaZigBee(topic, payload);
});

function pubblicaViaMqtt(mittente, contenuto) {
  var topic = '/unipg/zigbee-mqtt-bridge/zigbee-rx/' + mittente;
  var payload = contenuto;
  clientMqtt.publish(topic, payload);
  console.log('Bridging MQTT->ZigBee del contenuto %s (mittente %s)', contenuto, mittente);
}

function pubblicaEsitoTxViaMqtt(frameId, deliveryStatus) {
  var topic = '/unipg/zigbee-mqtt-bridge/zigbee-tx-delivery';
  var payload = {
    frameId: frameId,
    deliveryStatus: deliveryStatus
  };
  clientMqtt.publish(topic, JSON.stringify(payload));
  console.log('Bridging MQTT->ZigBee del frame %d', frameId);
}

function pubblicaViaZigBee(topic, payload) {
  // /unipg/zigbee-mqtt-bridge/mqtt-rx/<destinatario-zigbee>'
  // destinatario-zigbee <macaddress64>, "coordinator", "broadcast"
  var partiDelTopic = topic.split('/');
  if (partiDelTopic.length < 5) return;
  var tipoMessaggio = partiDelTopic[3];
  if (tipoMessaggio !== 'mqtt-rx') return;
  var destinatario = partiDelTopic[4];

  var frame_object = {
    type: C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST,
    data: payload
  };

  if (destinatario === 'coordinator') {
    frame_object.destination64 = C.COORDINATOR_64;
  } else if (destinatario === 'broadcast') {
    frame_object.destination16 = C.BROADCAST_16_XB;
  }

  if (partiDelTopic.length > 5) {
    frame_object.id = parseInt(partiDelTopic[5]);
  }

  var frame = xbeeAPI.buildFrame(frame_object);
  portaSeriale.write(frame);

  console.log('Bridging ZigBee->MQTT del frame %d', frame_object.id);
}
