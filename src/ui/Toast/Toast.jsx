import React, { useEffect, useRef, useState } from "react";
import styles from "./toast.module.css";

let _show = null;
export const show = (content = "") => _show?.(content);

const Toast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    _show = (content) => {
      setMessage(content);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    };
    return () => { _show = null; };
  }, []);

  if (!visible) return null;
  return <div className={styles.toast}>{message}</div>;
};

export default Toast;
