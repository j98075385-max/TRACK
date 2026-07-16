import React from "react";
import { createRoot } from "react-dom/client";
import HabitBoard from "./HabitBoard.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HabitBoard />
  </React.StrictMode>
);
