import CommonInput from "@/components/common/Input";
import { SignInProps } from "@/types/User";

const SignInInput = ({
  username,
  setUsername,
  password,
  setPassword,
  error,
}: SignInProps) => {
  const signInInputClassName = `w-full px-4 py-3 bg-slate-700 border rounded-xl text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${error ? "border-red-500" : "border-slate-600"}`;

  return (
    <>
      <CommonInput
        label='아이디'
        inputType='text'
        className={signInInputClassName}
        placeholder='아이디를 입력해주세요'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <CommonInput
        label='비밀번호'
        inputType='password'
        className={signInInputClassName}
        placeholder='비밀번호를 입력해주세요'
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        error={error}
      />
    </>
  );
};

export default SignInInput;
