import { useEffect, useRef, useState } from "react";
import styles from "./toast.module.css";
import { register } from "./toastApi";

const Toast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    return register(
      (content, duration) => {
        setMessage(content);
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (duration != null) {
          timerRef.current = setTimeout(() => setVisible(false), duration);
        }
      },
      () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
      }
    );
  }, []);

  if (!visible) return null;
  return <div className={styles.toast}>{message}</div>;
};

export default Toast;
