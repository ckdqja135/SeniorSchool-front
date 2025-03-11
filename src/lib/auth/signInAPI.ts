import { UserProps } from "@/types/User";

interface SignInResponse {
  user: UserProps;
  accessToken: string;
}

export const signIn = async (
  username: string,
  password: string,
): Promise<SignInResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/signIn`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "로그인에 실패했습니다.");
  }

  return data;
};
