"use client";
// The insider dashboard used to sit under the homepage; links to /#dashboard go to its own page.
// (Links with ?view= are redirected by the server, in next.config.mjs.)
import { useEffect } from "react";

export function HomeLinks() {
  useEffect(() => { if (location.hash === "#dashboard") location.replace("/insiders"); }, []);
  return null;
}
