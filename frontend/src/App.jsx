import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Setup from "./pages/Setup";
import Interview from "./pages/Interview";
import Report from "./pages/Report";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e1e3a",
            color: "#e2e8f0",
            border: "1px solid #4f46e5",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Setup />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}