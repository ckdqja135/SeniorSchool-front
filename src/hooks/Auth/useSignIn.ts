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
      router.replace("/myoriadmin");

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("accessToken", data.accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.includes("서버")
          ? error.message
          : "아이디나 비밀번호가 일치하지 않습니다.";

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
