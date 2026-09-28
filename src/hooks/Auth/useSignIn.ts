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
      // 아이디·비밀번호 실패는 어느 쪽이 틀렸는지 알려주지 않으려고 한 문장으로 뭉갠다.
      // 다만 '비활성화된 계정'은 비밀번호를 다시 쳐도 소용이 없으니 그대로 보여준다.
      const raw = error instanceof Error ? error.message : "";
      const errorMessage = /서버|비활성화/.test(raw)
        ? raw
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
