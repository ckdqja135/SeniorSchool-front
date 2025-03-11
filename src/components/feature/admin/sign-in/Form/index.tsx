"use client";

import SignInInput from "@/components/feature/admin/sign-in/Input";
import useSignIn from "@/hooks/Auth/useSignIn";
import CommonButton from "@/components/common/Button";

const SignInForm = () => {
  const { username, setUsername, password, setPassword, handleSignIn, error } =
    useSignIn();

  return (
    <div className='flex flex-col gap-4'>
      <SignInInput
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        error={error}
      />
      <CommonButton
        onClick={handleSignIn}
        className='w-full rounded-md border-2 bg-blue-500 px-4 py-2 hover:bg-blue-700'
      >
        <p className='select-none text-white'>로그인</p>
      </CommonButton>
    </div>
  );
};

export default SignInForm;
