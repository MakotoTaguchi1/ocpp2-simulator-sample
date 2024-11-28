import {
  BootNotificationRequest,
  BootNotificationResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  StatusNotificationRequest,
  OcppClient,
  OcppError,
  StatusNotificationResponse,
} from "@extrawest/node-ts-ocpp";

const centralSystemEndpoint = "ws://localhost:9000/";
const cpId = "CP1111";
const chargingPointSimple = new OcppClient(cpId);
let heartbeatInterval: NodeJS.Timeout;

chargingPointSimple.on("error", (err: Error) => {
  console.log(err.message);
  clearInterval(heartbeatInterval);
});

chargingPointSimple.on("close", () => {
  console.log("Connection closed");
  clearInterval(heartbeatInterval);
});

const startHeartbeat = async (interval: number) => {
  console.log("startHeartbeat:", interval);
  await sendHeartbeat();

  heartbeatInterval = setInterval(sendHeartbeat, interval * 1000);
};

const sendHeartbeat = async () => {
  try {
    console.log("Sending Heartbeat...");
    const heartbeat: HeartbeatRequest = {
      customData: {
        vendorId: "CP1111",
      },
    };
    const heartbeatResp: HeartbeatResponse =
      await chargingPointSimple.callRequest("Heartbeat", heartbeat);
    console.log("Heartbeat response:", heartbeatResp.currentTime);
  } catch (e) {
    if (e instanceof Error || e instanceof OcppError) {
      console.error("Heartbeat error:", e.message);
    }
  }
};

chargingPointSimple.on("connect", async () => {
  const bootReq: BootNotificationRequest = {
    chargingStation: {
      model: "someModel",
      vendorName: "someVendor",
    },
    reason: "Unknown",
  };
  const statusNotificationReq: StatusNotificationRequest = {
    timestamp: new Date().toISOString(),
    connectorStatus: "Unavailable", // 初期状態は利用不可。CSからのChangeAvailabilityによりAvailableに変更される
    evseId: 1,
    connectorId: 1,
  };

  try {
    // 1. BootNotificationを送信
    const bootResp: BootNotificationResponse =
      await chargingPointSimple.callRequest("BootNotification", bootReq);
    if (bootResp.status === "Accepted") {
      console.log("Bootnotification accepted");

      // 2. StatusNotificationを送信
      console.log("Sending StatusNotification...");
      const response = await chargingPointSimple.callRequest(
        "StatusNotification",
        statusNotificationReq
      );
      console.log("StatusNotification response received:", response);

      // 3. heartbeatを開始
      await startHeartbeat(bootResp.interval);
    }
  } catch (e) {
    if (e instanceof Error || e instanceof OcppError) {
      console.error(e.message);
    }
  }
});

chargingPointSimple.connect(centralSystemEndpoint);
