import { UserProps } from "@/types/User";

interface SignInResponse {
  user: UserProps;
  accessToken: string;
}

export const signIn = async (
  username: string,
  password: string,
): Promise<SignInResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const url = `${baseUrl}/admin/user/signIn`;
  
  console.log("API 요청 URL:", url);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    // 응답이 JSON이 아닌 경우 처리
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해주세요.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "로그인에 실패했습니다.");
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.");
    }
    throw error;
  }
};
