import * as WebSocket from "ws";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.printf(({ level, message, timestamp, ...metadata }) => {
      return `${timestamp} [${level}]: ${message} ${
        Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ""
      }`;
    })
  ),
  transports: [
    new transports.File({ filename: "logs/ocpp-messages.log" }),
    new transports.Console(),
  ],
});

const wss = new WebSocket.Server({ port: 9000 });

wss.on("connection", (ws) => {
  logger.info("新しいクライアント接続を受け付けました");

  ws.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      logger.info("受信したメッセージの生データ:", {
        rawMessage: message.toString(),
      });
      logger.info("パースされたメッセージ:", { parsedMessage });

      if (Array.isArray(parsedMessage)) {
        const [messageTypeId, messageId, action, payload] = parsedMessage;
        logger.info("メッセージの詳細:", {
          messageTypeId,
          messageId,
          action,
          payload,
        });

        switch (action) {
          case "BootNotification":
            const bootResponse = [
              3,
              messageId,
              {
                currentTime: new Date().toISOString(),
                interval: 3, // 3秒ごとにheartbeatを送信するようCPに伝える
                status: "Accepted",
              },
            ];
            ws.send(JSON.stringify(bootResponse));
            logger.info("BootNotificationレスポンスを送信", {
              response: bootResponse,
            });
            break;

          case "StatusNotification":
            const statusResponse = [3, messageId, {}];
            ws.send(JSON.stringify(statusResponse));
            logger.info("StatusNotificationを受信", {
              connectorStatus: payload.connectorStatus,
              evseId: payload.evseId,
              connectorId: payload.connectorId,
              timestamp: payload.timestamp,
            });
            logger.info("StatusNotificationレスポンスを送信", {
              response: statusResponse,
            });
            break;

          case "Heartbeat":
            const heartbeatResponse = [
              3,
              messageId,
              {
                currentTime: new Date().toISOString(),
              },
            ];
            ws.send(JSON.stringify(heartbeatResponse));
            logger.info("Heartbeatレスポンスを送信", {
              response: heartbeatResponse,
            });
            break;

          default:
            logger.warn("未知のアクション:", { action });
        }
      }
    } catch (error) {
      logger.error("メッセージ処理中にエラーが発生:", {
        error: error instanceof Error ? error.message : String(error),
        rawMessage: message.toString(),
      });
    }
  });

  ws.on("close", () => {
    logger.info("クライアント接続が切断されました");
  });

  ws.on("error", (error) => {
    logger.error("WebSocket接続でエラーが発生:", { error });
  });
});

logger.info("メッセージ受信サーバーを起動しました（ポート: 9000）");
