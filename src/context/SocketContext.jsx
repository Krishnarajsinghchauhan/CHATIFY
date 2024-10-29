import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo) {
      console.log("Initializing socket with userInfo:", userInfo);
      socket.current = io(HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });

      socket.current.on("connect", () => {
        console.log("Socket connected");
      });

      socket.current.on("connect_error", (error) => {
        console.error("Connection error:", error);
      });

      socket.current.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      socket.current.onAny((event, ...args) => {
        console.log(`Event received: ${event}`, args);
      });

      const handleReceiveMessage = (message) => {
        console.log("handleReceiveMessage called with:", message);

        // Ensure message has the expected structure
        if (message && typeof message === "object") {
          const {
            selectedChatData,
            selectedChatType,
            addMessage,
            addContactsInDMContactsList,
          } = useAppStore.getState();

          console.log("Selected chat data:", selectedChatData);
          console.log("Selected chat type:", selectedChatType);
          console.log("Message sender:", message.sender._id);
          console.log("Message recipient:", message.recipient._id);

          if (
            selectedChatType !== undefined &&
            (selectedChatData._id === message.sender._id ||
              selectedChatData._id === message.recipient._id)
          ) {
            addMessage(message);
          }
          addContactsInDMContactsList(message);
        } else {
          console.error("Received message structure is incorrect:", message);
        }
      };

      const handleReceiveChannelMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addChannelInChannelList,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          selectedChatData._id === message.channelId
        ) {
          addMessage(message);
        }

        addChannelInChannelList(message);
      };

      // Change the event name to match the emitted event
      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on(
        "recieve-channel-messages",
        handleReceiveChannelMessage
      );

      socket.current.on("senderMessage", (message) => {
        console.log("Sender message:", message);

        // Ensure message has the expected structure
        if (message && typeof message === "object") {
          const { selectedChatData, selectedChatType, addMessage } =
            useAppStore.getState();

          if (
            selectedChatType !== undefined &&
            (selectedChatData._id === message.sender._id ||
              selectedChatData._id === message.recipient._id)
          ) {
            addMessage(message);
          } else {
            console.log("Sender message is not relevant to the current chat");
          }
        } else {
          console.error(
            "Received sender message structure is incorrect:",
            message
          );
        }
      });

      return () => {
        socket.current.disconnect();
      };
    } else {
      console.log("No userInfo available, socket not initialized");
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};
