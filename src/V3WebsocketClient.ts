import {EventEmitter} from "events";
import WebSocket = require('ws');
import pako = require("pako");
import crypto = require("crypto");


export class V3WebsocketClient extends EventEmitter {
    private websocketUri: string;
    private socket?: WebSocket;

    constructor(
        websocketURI = 'wss://real.okex.com:10442/ws/v3'
    ) {
        super();
        this.websocketUri = websocketURI
    }

    connect() {
        if (this.socket) {
            this.socket.close();
        }

        this.socket = new WebSocket(this.websocketUri);
        console.log(`Connecting to ${this.websocketUri}`);

        this.socket.on('open', () => this.onOpen());
        this.socket.on('close', (code, reason) => this.onClose(code, reason))
        this.socket.on('message', data => this.onMessage(data))
    }

    login(apiKey: string, apiSecret: string, passphrase: string) {
        const timestamp = Date.now() / 1000;
        const str = timestamp + 'GET/users/self/verify';
        const hmac = crypto.createHmac('sha256', apiSecret);
        const request = JSON.stringify({op:"login", args:[apiKey, passphrase, timestamp.toString(), hmac.update(str).digest('base64')]});
        this.socket!.send(request);
    }

    subscribe(subscribe:string) {
        this.send({event: "subscribe", subscribe: subscribe});
    }

    private send(messageObject: any) {
        if (!this.socket) throw Error('socket is not open');
        this.socket.send(JSON.stringify(messageObject))

    }

    private onOpen() {
        console.log(`Connected to ${this.websocketUri}`);
        this.emit('open');
    }

    private onMessage(data: WebSocket.Data) {
        if (data instanceof String) {
            this.emit('message', data)
        } else {
            this.emit('message', pako.inflateRaw(data as any, {to: 'string'}))
        }
    }

    private onClose(code: number, reason: string) {
        console.log(`Websocket connection is closed.code=${code},reason=${reason}`);
        this.socket = undefined;
        this.emit('close');
    }

    close() {
        if (this.socket) {
            console.log(`Closing websocket connection...`);
            this.socket.close();
            this.socket = undefined;
        }
    }

}