import SignInForm from "@/components/feature/admin/sign-in/Form";

const SignInPage = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='flex w-[40%] max-w-[550px] gap-4 rounded-lg border-2 border-gray-200 bg-white p-8'>
        <div className='flex w-full flex-col gap-2'>
          {/* 로그인 페이지 제목 */}
          <p className='flex select-none justify-center text-2xl font-bold mb-4'>
            로그인
          </p>
          {/* 로그인 폼 */}
          <SignInForm />
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
