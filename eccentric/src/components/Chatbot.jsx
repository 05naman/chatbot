import React, { useState, useEffect, useRef } from "react";
import { IoSend } from "react-icons/io5";
import { TbMessageChatbot } from "react-icons/tb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaRobot } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { MdKeyboardVoice } from "react-icons/md";
import { RiVoiceprintFill } from "react-icons/ri";

const Chatbot = () => {
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [location, setLocation] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  const chatContainerRef = useRef(null);
  const recognition = useRef(null);

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
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    recognition.current = new window.webkitSpeechRecognition();
    recognition.current.lang = language;
    recognition.current.continuous = false;
    recognition.current.interimResults = false;

    recognition.current.onstart = () => {
      console.log("Speech recognition started...");
      setIsListening(true);
    };

    recognition.current.onend = () => {
      console.log("Speech recognition stopped.");
      setIsListening(false);
    };

    recognition.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Speech recognized:", transcript);
      setMessage(transcript);
    };
  }, [language]);

  const fetchPlaces = async (category) => {
    if (!location) {
      alert("Location access required.");
      return [];
    }

    const { latitude, longitude } = location;
    const apiUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${80.9039962},${26.8499952},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      return data.features.map((place) => `${place.properties.name || "Unnamed"} - ${place.properties.distance}m away`);
    } catch (error) {
      console.error("Error fetching places:", error);
      return [];
    }
  };

  const handleUserQuery = async () => {
    if (!message.trim()) return;

    updateMessages("userMsg", message);

    let category = null;
    if (message.toLowerCase().includes("nearby hospitals")) category = "healthcare.hospital";
    else if (message.toLowerCase().includes("nearby pharmacies")) category = "healthcare.pharmacy";
    else if (message.toLowerCase().includes("nearby restaurants")) category = "catering.restaurant";

    if (category) {
      const places = await fetchPlaces(category);
      updateMessages("responseMsg", places.length ? `Nearby places:\n${places.join("\n")}` : "No places found.");
    } else {
      generateResponse(message);
    }

    setMessage("");
  };

  const generateResponse = async (msg) => {
    if (!msg) return;

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(msg);
      updateMessages("responseMsg", result.response.text().replace(/\*\*/g, ""));
    } catch (error) {
      console.error("AI response error:", error);
      updateMessages("responseMsg", "Sorry, I couldn't process that.");
    }
  };

  const updateMessages = (type, text) => {
    setMessages((prevMessages) => [...prevMessages, { type, text }]);
  };

  const handleChatbotToggle = () => {
    if (!isChatbotVisible) updateMessages("responseMsg", "Hi, how can I help you?");
    setChatbotVisible(!isChatbotVisible);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleUserQuery();
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Your browser does not support speech recognition.");
      return;
    }
  
    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
      console.log("Speech recognition stopped.");
      return;
    }
  
    recognition.current = new window.webkitSpeechRecognition();
    recognition.current.lang = language;
    recognition.current.continuous = false; // Stop after user speaks
    recognition.current.interimResults = true; // Capture interim results for debugging
  
    recognition.current.onstart = () => {
      setIsListening(true);
      console.log("Speech recognition started...");
    };
  
    recognition.current.onend = () => {
      setIsListening(false);
      console.log("Speech recognition stopped.");
    };
  
    recognition.current.onresult = (event) => {
      console.log("Speech recognition result event:", event);
      if (event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        console.log("Recognized Text:", transcript);
        setMessage(transcript);
      } else {
        console.log("No speech recognized.");
      }
    };
  
    recognition.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };
  
    recognition.current.start();
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="fixed bottom-4 right-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg">
          <TbMessageChatbot className="text-red-600 text-6xl" onClick={handleChatbotToggle} />
        </div>
      </div>

      {isChatbotVisible && (
        <div className="w-[400px] h-[550px] bg-white shadow-lg rounded-lg flex flex-col fixed bottom-4 right-4">
          <div className="w-full h-16 bg-red-500 shadow-md rounded flex items-center justify-start pl-4">
            <FaRobot className="text-white text-2xl mr-2" />
            <p className="text-white text-xl font-semibold">Sanrakshak</p>
            <IoMdClose className="text-white text-2xl ml-auto mr-4 cursor-pointer hover:text-gray-200" onClick={handleChatbotToggle} />
          </div>

          <div className="p-4 h-96 overflow-y-auto border-b bg-gray-100 border-gray-300" ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 flex ${msg.type === "userMsg" ? "justify-end" : "justify-start"}`}>
                <div className="p-3 rounded max-w-[70%] break-words bg-red-400 text-black">
                  {msg.text.split("\n").map((line, idx) => <span key={idx} className="block">{line}</span>)}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center p-4">
            <button onClick={startListening} className="bg-red-500 text-white px-4 py-2 rounded mr-2 text-2xl">
              {isListening ? <RiVoiceprintFill /> : <MdKeyboardVoice />}
            </button>
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} type="text" className="flex-1 bg-transparent text-black outline-none placeholder-gray-500" placeholder="Write your message..." />
            <IoSend className="text-red-600 text-2xl cursor-pointer ml-4" onClick={handleUserQuery} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
