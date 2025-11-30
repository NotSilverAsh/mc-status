# MC-Status

A simple Node.js library to fetch **Java Edition** and **Bedrock Edition** Minecraft server status.

---

## Warning

This package is still in early development. Bugs and breaking changes may occur. Please report any issues on GitHub.

---

## Requirements

- Node.js v18 or higher

---

## Installation

```bash
npm install @shorkiedev/mc-status
# or
yarn add @shorkiedev/mc-status
```

---

# Usage/Examples
### Pinging Multiple Servers

```javascript
import { pingServers } from '@shorkiedev/mc-status';

const serversList = [
    { name: "Java Server", host: "demo.mcstatus.io", port: 25565, type: "java", timeout: 10000 },
    { name: "Bedrock Server", host: "demo.mcstatus.io", port: 19132, type: "bedrock", timeout: 10000 },
];

(async () => {
    const pingResult = await pingServers(serversList);
    console.log("------PING RESULT------");
    console.log(pingResult);
});
```

### Expected Output:
```json
{
  "multiServerPing": [
    {
      "name": "Java Demo",
      "type": "java",
      "online": true,
      "latency": 783,
      "motd": "    §red;;; §red>§gold>§yellow> §whiteMinecraft Server Status §yellow<§gold<§red< §red;;;\n             §goldhttps://mcstatus.io/",
      "playersOnline": 71,
      "playersMax": 100,
      "version": "1.20.1"
    },
    {
      "name": "Bedrock Demo",
      "type": "bedrock",
      "online": true,
      "latency": 537,
      "motd": "A Bedrock server",
      "playersOnline": 62,
      "playersMax": 100,
      "version": "1.19.70"
    }
  ],
  "singleJavaPing": {
    "online": true,
    "latency": 783,
    "motd": "    §red;;; §red>§gold>§yellow> §whiteMinecraft Server Status §yellow<§gold<§red< §red;;;\n             §goldhttps://mcstatus.io/",
    "playersOnline": 71,
    "playersMax": 100,
    "version": "1.20.1"
  },
  "singleBedrockPing": {
    "online": true,
    "latency": 537,
    "motd": "A Bedrock server",
    "playersOnline": 62,
    "playersMax": 100,
    "version": "1.19.70"
  }
}
```

### Pinging A Single Java Server

```javascript
import { getJavaServer } from '@shorkiedev/mc-status';

(async () => {
    const singlePingResult = await getJavaServer("demo.mcstatus.io", 25565, 10000);

    console.log("------SINGLE JAVA PING RESULT------");
    console.log(singlePingResult);
});
```

### Expected Output:
```json
{
  "online": true,
  "latency": 783,
  "motd": "    §red;;; §red>§gold>§yellow> §whiteMinecraft Server Status §yellow<§gold<§red< §red;;;\n             §goldhttps://mcstatus.io/",
  "playersOnline": 71,
  "playersMax": 100,
  "version": "1.20.1"
}
```

---

### Pinging A Single Bedrock Server

```javascript
import { getBedrockServer } from '@shorkiedev/mc-status';

(async () => {
    const singlePingResult = await getBedrockServer("demo.mcstatus.io", { port: 19132, timeout: 10000 });

    console.log("------SINGLE BEDROCK PING RESULT------");
    console.log(singlePingResult);
});
```

### Expected Output:
```json
{
  "online": true,
  "latency": 537,
  "motd": "A Bedrock server",
  "playersOnline": 62,
  "playersMax": 100,
  "version": "1.19.70"
}
```