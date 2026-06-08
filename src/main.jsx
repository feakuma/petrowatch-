import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PetroWatch from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PetroWatch />
  </StrictMode>
);
