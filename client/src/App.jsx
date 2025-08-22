import React from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import axios from "axios";

import Home from "./pages/Home";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import WriteArticle from "./pages/WriteArticle";
import BlogTitles from "./pages/BlogTitles";
import GenerateImages from "./pages/GenerateImages";
import RemoveObject from "./pages/RemoveObject";
import RemoveBackground from "./pages/RemoveBackground";
import Community from "./pages/Community";
import ReviewResume from "./pages/ReviewResume";

// Create a central apiFetch wrapper for axios
const apiFetch = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

export default function App() {
  return (
    <div>
      <Toaster />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ai" element={<Layout apiFetch={apiFetch} />}>
          <Route index element={<Dashboard apiFetch={apiFetch} />} />
          <Route path="write-article" element={<WriteArticle apiFetch={apiFetch} />} />
          <Route path="blog-titles" element={<BlogTitles apiFetch={apiFetch} />} />
          <Route path="generate-images" element={<GenerateImages apiFetch={apiFetch} />} />
          <Route path="remove-background-image" element={<RemoveBackground apiFetch={apiFetch} />} />
          <Route path="remove-object" element={<RemoveObject apiFetch={apiFetch} />} />
          <Route path="review-resume" element={<ReviewResume apiFetch={apiFetch} />} />
          <Route path="community" element={<Community apiFetch={apiFetch} />} />
        </Route>
      </Routes>
    </div>
  );
}
