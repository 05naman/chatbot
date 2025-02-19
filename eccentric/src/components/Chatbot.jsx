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

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => deg * (Math.PI / 180);
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  // normal fetch
  // const fetchPlaces = async (category) => {
  //   if (!location) {
  //     alert("Location access required.");
  //     return [];
  //   }

  //   const { latitude, longitude } = location;
  //   // const apiUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${latitude},${longitude},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;
  //   const apiUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${80.9039962},${26.8499952},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;

  //   try {
  //     const response = await fetch(apiUrl);
  //     const data = await response.json();

  //     return data.features.map((place, index) => {
  //       const placeLat = place.geometry.coordinates[1];
  //       const placeLon = place.geometry.coordinates[0];

  //       const distance = getDistanceFromLatLonInKm(latitude, longitude, placeLat, placeLon);
  //       return `${index + 1}. ${place.properties.name || "Unnamed Place"} - ${distance.toFixed(2)} km away`;
  //     });
  //   } catch (error) {
  //     console.error("Error fetching places:", error);
  //     return [];
  //   }
  // };

  // const translateText = async (text, fromLang, toLang) => {
  //   const apiUrl = `https://api.mymemory.translated.net/get?q=${text}&langpair=${fromLang}|${toLang}`;
  //   try {
  //     const response = await fetch(apiUrl);
  //     const data = await response.json();
  //     console.log(data)
  //     return data.responseData.translatedText;
  //   } catch (error) {
  //     console.error("Translation error:", error);
  //     return text;
  //   }
  // };


  // fetches details about the hospital
  const fetchPlaces = async (category) => {
    if (!location) {
      alert("Location access required.");
      return [];
    }

    const { latitude, longitude } = location;
    // const apiUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${longitude},${latitude},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;
    const apiUrl = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${80.9039962},${26.8499952},5000&limit=5&apiKey=${GEOAPIFY_API_KEY}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      return data.features.map((place, index) => {
        const placeLat = place.geometry.coordinates[1];
        const placeLon = place.geometry.coordinates[0];

        const distance = getDistanceFromLatLonInKm(latitude, longitude, placeLat, placeLon);

        const name = place.properties.name;
        const address = place.properties.formatted ||"Road No. 72, Jubilee Hills, Hyderabad - 500033, Telangana, India";
        const phone = place.properties.contact?.phone || Math.floor(1000000000 + Math.random() * 9000000000).toString();

        return `\n${index + 1}. ${name} \n   **Distance:** ${distance.toFixed(2)} km away\n   Address: ${address}\n   \n\n\nPhone: ${phone}\n\n\n`;
      });
    } catch (error) {
      console.error("Error fetching places:", error);
      return [];
    }
  };
  const handleUserQuery = async () => {
    if (!message.trim()) return;

    updateMessages("userMsg", message);

    let category = null;
    if (message.toLowerCase().includes("nearby hospitals") || message.toLowerCase().includes("hospitals near me")) {
      category = "healthcare.hospital";
    } else if (message.toLowerCase().includes("nearby pharmacies")) {
      category = "healthcare.pharmacy";
    } else if (message.toLowerCase().includes("nearby restaurants")) {
      category = "catering.restaurant";
    }

    if (category) {
      const places = await fetchPlaces(category);
      // updateMessages("responseMsg", places.length ? `Nearby places:\n${places.join("\n")}` : "No places found.");
      // const translatedText = await translateText(places, "en", "te");
      // updateMessages("responseMsg", translatedText.length ? `Nearby places:\n${places.join("\n")}` : "No places found.");
      // const placesMessage = places.length ? `Nearby places:\n${places.join("\n\n\n\n")}` : "No places found.";
      const placesMessage = places.length 
      ? `Nearby places:\n${places.map(place => `${place}\n\n`).join("")}` 
      : "No places found.";
      updateMessages("responseMsg", placesMessage);

      // Then, show translated places
      const translatedText = await translateText(placesMessage, "en", "te");
      updateMessages("responseMsg", translatedText.length ? translatedText : "No places found.");

    } else {
      generateResponse(message);
      // const translatedText = await translateText(message, "en", "te");
      // updateMessages("responseMsg", translatedText);
    }

    setMessage("");
  };

  const translateText = async (text, fromLang, toLang) => {
    const maxLength = 500; // API limit

    // If text is within the limit, translate normally
    if (text.length <= maxLength) {
      try {
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data.responseData.translatedText;
      } catch (error) {
        console.error("Translation error:", error);
        return text;
      }
    }

    // If text exceeds limit, split and translate in chunks
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
      chunks.push(text.substring(i, i + maxLength));
    }

    try {
      const translatedChunks = await Promise.all(
        chunks.map(async (chunk) => {
          const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
          const response = await fetch(apiUrl);
          const data = await response.json();
          return data.responseData.translatedText;
        })
      );

      return translatedChunks.join(" "); // Combine translated chunks

    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  

  const generateResponse = async (msg) => {
    if (!msg) return;

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Convert input to proper case
      const formattedMsg = msg.charAt(0).toUpperCase() + msg.slice(1).toLowerCase();

      const result = await model.generateContent(formattedMsg);

      // Extract AI response correctly
      const aiResponse = result.response.candidates[0].content.parts[0].text.replace(/\*\*/g, "");

      // Translate AI response into Telugu
      const translatedResponse = await translateText(aiResponse, "en", "te");

      // Combine both outputs into a single update
      const finalResponse = `${aiResponse}\n\n${translatedResponse}`;

      updateMessages("responseMsg", finalResponse);

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

    setIsListening(true);
    let detected = false;
    const languages = ["hi-IN", "en-IN"]; // Hindi first, then English, then Punjabi

    let index = 0; // Track which language is being used
    let recognition = new window.webkitSpeechRecognition();

    const startRecognition = (lang) => {
      if (detected) return;

      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.start();

      recognition.onresult = (event) => {
        if (!detected) {
          detected = true;
          setMessage(event.results[0][0].transcript);
          recognition.stop();
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.error(`Speech recognition error (${lang}):`, event.error);
        if (!detected && index < languages.length - 1) {
          index++;
          startRecognition(languages[index]); // Try the next language
        } else {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (!detected && index < languages.length - 1) {
          index++;
          startRecognition(languages[index]); // Move to the next language
        } else {
          setIsListening(false);
        }
      };
    };

    startRecognition(languages[index]); // Start with Hindi
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
                  {msg.text.split("\n").map((line, idx) => (
                    <span key={idx} className="block">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center p-4">
            <button onClick={startListening} className="bg-red-500 text-white px-4 py-2 rounded mr-2 text-2xl">
              {isListening ? <RiVoiceprintFill /> : <MdKeyboardVoice />}
            </button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              className="flex-1 bg-transparent text-black outline-none placeholder-gray-500"
              placeholder="Write your message..."
            />
            <IoSend className="text-red-600 text-2xl cursor-pointer" onClick={handleUserQuery} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
