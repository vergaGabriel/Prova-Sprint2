// src/simulator/gateway.js
// Um gateway por setor. Cada gateway e um CLIENTE MQTT proprio (modela
// melhor a realidade: 3 dispositivos fisicos no campus, cada um com sua
// conexao). Isso permite usar Last Will (LWT) por gateway.
//
// Last Will (LWT): mensagem que o BROKER publica automaticamente em nome
// do cliente quando ele cai sem aviso (crash, queda de rede, processo
// morto). O cliente registra a will na hora de conectar; o broker so
// dispara se a desconexao for INESPERADA.

const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class Gateway {
  constructor({ sectorId, sensors }) {
    this.sectorId = sectorId;
    this.sensors = sensors;
    this.startedAt = Date.now();
    this.eventsPublished = 0;
    this.connected = false;

    // ----- monta o LWT (Last Will) -----
    const willPayload = JSON.stringify({
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      status: 'offline',
      reason: 'unexpected_disconnect',
    });

    const clientId = `gw-${sectorId}-${config.namespace || 'sim'}-${Math.random()
      .toString(16)
      .slice(2, 6)}`;

    this.mqttClient = mqtt.connect(config.mqttUrl, {
      clientId,
      reconnectPeriod: 2000,
      clean: true,
      will: {
        topic: config.topics.gatewayStatus(this.sectorId),
        payload: willPayload,
        qos: 1,
        retain: true,
      },
    });

    this.mqttClient.on('connect', () => {
      this.connected = true;
      console.log(`[gw-${sectorId}] conectado (clientId=${clientId})`);
    });
    this.mqttClient.on('error', (err) =>
      console.error(`[gw-${sectorId}] erro MQTT:`, err.message)
    );
    this.mqttClient.on('reconnect', () =>
      console.log(`[gw-${sectorId}] reconectando...`)
    );
    this.mqttClient.on('close', () => {
      this.connected = false;
    });
  }

  whenConnected() {
    return new Promise((resolve) => {
      if (this.connected) return resolve();
      this.mqttClient.once('connect', () => resolve());
    });
  }

  publishSpotEvent({ spotId, state, source = 'sensor' }) {
    const payload = {
      eventId: uuidv4(),
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      spotId,
      state,
      source,
    };
    const topic = config.topics.spotEvents(this.sectorId, spotId);
    this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
    this.eventsPublished++;
    return payload;
  }

  publishStatus(status = 'online') {
    const ocupadas = this.sensors.filter((s) => s.state === 'OCCUPIED').length;
    const comFalha = this.sensors.filter((s) => s.fault).length;
    const payload = {
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      status,
      uptimeS: Math.floor((Date.now() - this.startedAt) / 1000),
      sensorsTotal: this.sensors.length,
      sensorsOccupied: ocupadas,
      sensorsFree: this.sensors.length - ocupadas,
      sensorsFaulty: comFalha,
      eventsPublished: this.eventsPublished,
    };
    const topic = config.topics.gatewayStatus(this.sectorId);
    this.mqttClient.publish(topic, JSON.stringify(payload), {
      qos: 1,
      retain: true,
    });
    return payload;
  }

  publishAlert(alert) {
    const payload = {
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      ...alert,
    };
    const topic = config.topics.sectorAlerts(this.sectorId);
    this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
    return payload;
  }

  shutdown() {
    return new Promise((resolve) => {
      this.publishStatus('offline');
      setTimeout(() => {
        this.mqttClient.end(true, {}, () => resolve());
      }, 200);
    });
  }
}

module.exports = { Gateway };
