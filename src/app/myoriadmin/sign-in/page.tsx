import SignInForm from "@/components/feature/admin/sign-in/Form";
import Image from "next/image";

const SignInPage = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-900'>
      <div className='w-full max-w-[420px] mx-4'>
        {/* 로고 / 브랜딩 영역 */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 overflow-hidden'>
            <Image src="/images/duck.png" alt="Ori" width={48} height={48} />
          </div>
          <h1 className='text-2xl font-bold text-white'>관리자 로그인</h1>
          <p className='text-slate-400 text-sm mt-1'>Myori Admin Dashboard</p>
        </div>

        {/* 로그인 카드 */}
        <div className='bg-slate-800 rounded-2xl p-8 shadow-2xl'>
          <SignInForm />
        </div>

        <p className='text-center text-slate-500 text-xs mt-6'>
          &copy; 2026 Myori. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
