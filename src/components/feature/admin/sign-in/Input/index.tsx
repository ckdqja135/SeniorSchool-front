import CommonInput from "@/components/common/Input";
import { SignInProps } from "@/types/User";

const SignInInput = ({
  username,
  setUsername,
  password,
  setPassword,
  error,
}: SignInProps) => {
  const signInInputClassName = `p-1 border-2 rounded-md placeholder:text-gray-300 placeholder:text-medium min-w-12 w-full ${error ? "border-red-500" : "border-gray-300"}`;

  return (
    <>
      <CommonInput
        label='아이디'
        inputType='text'
        className={signInInputClassName}
        placeholder='아이디를 입력해주세요'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={error}
      />
      <CommonInput
        label='비밀번호'
        inputType='password'
        className={signInInputClassName}
        placeholder='******'
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        error={error}
      />
    </>
  );
};

export default SignInInput;
