"use client";

import SignInInput from "@/components/feature/admin/sign-in/Input";
import useSignIn from "@/hooks/Auth/useSignIn";
import CommonButton from "@/components/common/Button";

const SignInForm = () => {
  const { username, setUsername, password, setPassword, handleSignIn, error } =
    useSignIn();

  // 엔터 키 이벤트 핸들러
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className='flex flex-col gap-5 [&_label]:text-slate-300 [&_label]:text-sm [&_label]:font-medium' onKeyPress={handleKeyPress}>
      <SignInInput
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        error={error}
      />
      <CommonButton
        onClick={handleSignIn}
        className='w-full rounded-xl bg-indigo-600 px-4 py-3 hover:bg-indigo-700 active:bg-indigo-800 transition-colors'
      >
        <p className='select-none text-white font-semibold text-sm tracking-wide'>로그인</p>
      </CommonButton>
    </div>
  );
};

export default SignInForm;
