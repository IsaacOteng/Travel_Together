import { useState, useEffect, useRef } from "react";
import { UN_RE } from "./constants";
import { authApi } from "../../../services/api.js";

export function useUsername(val) {
  const [status, set] = useState("idle");
  const t = useRef(null);

  useEffect(() => {
    clearTimeout(t.current);
    if (!val)             { set("idle");    return; }
    if (!UN_RE.test(val)) { set("invalid"); return; }
    set("checking");
    t.current = setTimeout(async () => {
      try {
        const { data } = await authApi.checkUsername(val);
        set(data.available ? "available" : "taken");
      } catch {
        set("available");
      }
    }, 650);
    return () => clearTimeout(t.current);
  }, [val]);

  return status;
}
