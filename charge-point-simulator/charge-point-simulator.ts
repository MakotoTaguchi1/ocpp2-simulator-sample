import {
  BootNotificationRequest,
  BootNotificationResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  OcppClient,
  OcppError,
} from "@extrawest/node-ts-ocpp";

const chargingPointSimple = new OcppClient("CP1111");
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
  const boot: BootNotificationRequest = {
    chargingStation: {
      model: "someModel",
      vendorName: "someVendor",
    },
    reason: "Unknown",
  };

  try {
    const bootResp: BootNotificationResponse =
      await chargingPointSimple.callRequest("BootNotification", boot);
    if (bootResp.status === "Accepted") {
      console.log("Bootnotification accepted");
      await startHeartbeat(bootResp.interval);
    }
  } catch (e) {
    if (e instanceof Error || e instanceof OcppError) {
      console.error(e.message);
    }
  }
});

chargingPointSimple.connect("ws://localhost:9000/");
