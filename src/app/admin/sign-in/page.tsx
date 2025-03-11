import Link from "next/link";
import SignInForm from "@/components/feature/admin/sign-in/Form";

const SignInPage = () => {
  return (
    <div className='flex h-full items-center justify-center bg-gray-100'>
      <div className='flex w-[40%] max-w-[550px] gap-4 rounded-lg border-2 border-gray-200 bg-white p-8'>
        <div className='flex w-full flex-col gap-2'>
          {/* 로그인 페이지 제목 */}
          <p className='flex select-none justify-center text-title-1 font-bold'>
            로그인
          </p>
          {/* 로그인 폼 */}
          <SignInForm />
          {/* 아이디가 없을 경우 sign-up 페이지로 안내 */}
          <div className='flex flex-row items-center justify-center gap-2'>
            <p className='select-none text-label-medium font-medium'>
              아직 계정이 없으신가요?
            </p>
            {/* 아예 없앨지 말지 고민중 */}
            <Link href='/admin'>
              <p className='text-medium font-medium text-blue-300 underline'>
                회원가입하기
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
