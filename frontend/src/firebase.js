import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCnfp6qvULf3QefiFhG1dO7MSYL-UHCnBk",
  authDomain: "sponsorhsip.firebaseapp.com",
  projectId: "sponsorhsip",
  storageBucket: "sponsorhsip.firebasestorage.app",
  messagingSenderId: "1040742905362",
  appId: "1:1040742905362:web:33b20fe19f12feda218acb",
  measurementId: "G-7163XR5YSM",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const storage = getStorage(app);

// Function to handle event creation
export const handleCreateEvent = async (eventData, user) => {
  const userId = user.uid;
  const userType = user.userType;

  const eventRef =
    userType === "entity"
      ? `entities/${userId}/events`
      : `seekers/${userId}/events`;
  const eventsCollectionRef = collection(db, eventRef);

  try {
    await addDoc(eventsCollectionRef, {
      ...eventData,
      createdAt: Timestamp.fromDate(new Date()),
      userType,
      userId,
    });

    console.log("Event created successfully!");
  } catch (error) {
    console.error("Error creating event: ", error);
    throw new Error("Failed to create event");
  }
};

export default storage;
