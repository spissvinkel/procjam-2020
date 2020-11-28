const express = require('express');
const http = require('http');
const path = require('path');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 3000;

const STATIC_DIR = 'dist';

const LOGGER = console;

const exitOnError = e => {
    LOGGER.error(errString(e));
    process.exit(1);
};

const exitOnSignal = s => {
    LOGGER.info(`${s} received - exiting...`);
    stopWebServer()
        .then(() => process.exit(0))
        .catch(exitOnError);
};

process
    .on('SIGINT', exitOnSignal)
    .on('SIGHUP', exitOnSignal)
    .on('SIGTERM', exitOnSignal)
    .on('uncaughtException', exitOnError)
    .on('unhandledRejection', exitOnError)
    .on('exit', () => LOGGER.info('exit event received - process stopped'));

const main = async () => {
    try {
        LOGGER.debug('starting web server...');
        await startWebServer();
        LOGGER.info('web server started');
    } catch (err) {
        exitOnError(err);
    }
};

let webServer = undefined;

const startWebServer = () => {
    return new Promise((resolve, reject) => {
        LOGGER.info(`starting listener on ${SERVER_HOST}:${SERVER_PORT}...`);
        try {
            const app = express();
            app.use('/', express.static(path.resolve(__dirname, STATIC_DIR)));
            webServer = http
                .createServer(app)
                .on('error', reject)
                .listen(SERVER_PORT, SERVER_HOST, resolve);
        } catch (e) {
            LOGGER.error(`failed to start listener on port ${SERVER_PORT}`);
            reject(e);
        }
    });
};

const stopWebServer = () => {
    if (webServer === undefined) return Promise.resolve();
    return new Promise((resolve, reject) => {
        LOGGER.info('stopping...');
        try {
            webServer?.close(e => e === undefined ? resolve() : reject(e));
        } catch (e) {
            LOGGER.error('failed to close server');
            reject(e);
        }
    });
};

const errString = err => {
    try { return JSON.stringify(err); }
    catch (x) { return `${err}`; }
};

main();
