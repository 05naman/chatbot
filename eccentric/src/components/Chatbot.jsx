import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { TbMessageChatbot } from "react-icons/tb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaRobot } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";

const Chatbot = () => {
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [location, setLocation] = useState(null);
  const chatContainerRef = useRef(null);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert("Please enable location permissions in your browser.");
              break;
            case error.POSITION_UNAVAILABLE:
              console.error("Location unavailable.");
              break;
            case error.TIMEOUT:
              console.error("Location request timed out.");
              break;
            default:
              console.error("Unknown geolocation error.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => deg * (Math.PI / 180);
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyHospitals = async () => {
    if (!location) {
      alert("Unable to fetch location. Please try again.");
      return [];
    }
    
    const { latitude, longitude } = location;
    const apiUrl = `https://api.geoapify.com/v2/places?categories=healthcare.hospital&filter=circle:${80.9039962},${26.8499952},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      return data.features.map((hospital) => {
        const hospitalLat = hospital.geometry.coordinates[1];
        const hospitalLon = hospital.geometry.coordinates[0];

        const distance = getDistanceFromLatLonInKm(
          latitude,
          longitude,
          hospitalLat,
          hospitalLon
        );

        return `${hospital.properties.name || "Unnamed Hospital"} - ${distance.toFixed(2)} km away`;
      });
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      return [];
    }
  };

  const handleUserQuery = async () => {
    if (!message.trim()) return;

    updateMessages("userMsg", message);

    if (message.toLowerCase().includes("nearby hospitals")) {
      const hospitals = await fetchNearbyHospitals();
      const hospitalResponse = hospitals.length
        ? `Nearby hospitals:\n\n${hospitals.map((hospital, index) => `${index + 1}. ${hospital}`).join("\n")}`
        : "No hospitals found nearby.";

      updateMessages("responseMsg", hospitalResponse);
    } else {
      generateResponse(message);
    }

    setMessage("");
  };

  const generateResponse = async (msg) => {
    if (!msg) return;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(msg);

    const cleanResponse = (text) => text.replace(/\*\*/g, "");
    const cleanedResponse = cleanResponse(result.response.text());

    updateMessages("responseMsg", cleanedResponse);
  };

  const updateMessages = (type, text) => {
    setMessages((prevMessages) => [...prevMessages, { type, text }]);
  };

  const handleChatbotToggle = () => {
    if (!isChatbotVisible) {
      updateMessages("responseMsg", "Hi, how can I help you?");
    }
    setChatbotVisible(!isChatbotVisible);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleUserQuery();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="fixed bottom-4 right-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg">
          <TbMessageChatbot
            className="text-red-600 text-6xl"
            onClick={handleChatbotToggle}
          />
        </div>
      </div>

      {isChatbotVisible && (
        <div className="w-[400px] h-[500px] bg-white shadow-lg rounded-lg flex flex-col fixed bottom-4 right-4">
          <div className="w-full h-16 bg-red-500 shadow-md rounded flex items-center justify-start pl-4">
            <FaRobot className="text-white text-2xl mr-2" />
            <p className="text-white text-xl font-semibold">Sanrakshak</p>
            <IoMdClose
              className="text-white text-2xl ml-auto mr-4 cursor-pointer hover:text-gray-200"
              onClick={handleChatbotToggle}
            />
          </div>

          <div className="p-4 h-96 overflow-y-auto border-b bg-gray-100 border-gray-300" ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 flex ${msg.type === "userMsg" ? "justify-end" : "justify-start"}`}>
                <div className={`p-3 rounded max-w-[70%] break-words text-base font-serif font-normal ${msg.type === "userMsg" ? "bg-red-400 text-black" : "bg-red-400 text-black"}`}>
                  {msg.text.split("\n").map((line, idx) => (
                    <span key={idx} className="block">{line}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center">
            <div className="inputBox w-full max-w-4xl flex items-center bg-gray-100 rounded p-4">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                className="flex-1 bg-transparent text-black outline-none placeholder-gray-500"
                placeholder="Write your message here..."
              />
              <IoSend
                className="text-red-600 text-2xl cursor-pointer ml-4 hover:text-red-600"
                onClick={handleUserQuery}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
