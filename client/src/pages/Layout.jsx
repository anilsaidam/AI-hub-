// Layout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { Menu, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { SignIn, SignedIn, SignedOut, UserButton, useAuth } from "@clerk/clerk-react";

export default function Layout() {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);

  // Clerk hooks
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Debug states so you can see what's happening
    console.log("Clerk state:", { isLoaded, isSignedIn });

    // If Clerk not loaded yet, wait
    if (!isLoaded) return;

    // Only when signed in -> fetch token
    if (isSignedIn) {
      let cancelled = false;
      (async () => {
        try {
          // Try with the named template if you created it; fallback to default getToken()
          let token;
          try {
            token = await getToken({ template: "default" });
          } catch (e) {
            // fallback if the template doesn't exist
            console.warn("getToken({template:'default'}) failed, falling back to getToken():", e.message || e);
            token = await getToken();
          }

          if (!cancelled) {
            console.log("🔑 Clerk JWT (full):", token);
          }
        } catch (err) {
          console.error("Failed to fetch Clerk token:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <div className="flex flex-col items-start justify-start h-screen">
      {/* Navbar */}
      <nav className="w-full px-8 min-h-14 flex items-center justify-between border-b border-gray-200">
        <img
          className="cursor-pointer w-32 sm:w-44"
          src={assets.logo}
          alt="Logo"
          onClick={() => navigate("/")}
        />

        {/* Show UserButton when signed in; no duplicate elsewhere */}
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>

        {/* mobile sidebar toggles */}
        {sidebar ? (
          <X onClick={() => setSidebar(false)} className="w-6 h-6 text-gray-600 sm:hidden" />
        ) : (
          <Menu onClick={() => setSidebar(true)} className="w-6 h-6 text-gray-600 sm:hidden" />
        )}
      </nav>

      {/* Main layout */}
      <div className="flex-1 w-full flex h-[calc(100vh-64px)]">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <div className="flex-1 bg-[#F4F7FB]">
          <SignedIn>
            <Outlet />
          </SignedIn>

          <SignedOut>
            <div className="flex items-center justify-center h-full">
              <div className="w-full max-w-md p-6">
                <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
              </div>
            </div>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
