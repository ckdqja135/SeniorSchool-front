"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth/signInAPI";

export default function useSignIn() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setError("");
    try {
      const data = await signIn(username, password);
      router.replace("/admin");

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("accessToken", data.accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했습니다. 다시 시도해주세요.";

      setError(errorMessage);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    handleSignIn,
    error,
  };
}
