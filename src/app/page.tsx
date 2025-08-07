import Link from "next/link";
import React from "react";

const HomePage = () => {
  return (
    <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-md p-8'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-800 mb-4'>
            환영합니다!
          </h1>
          <p className='text-gray-600 mb-8'>
            SeniorSchool 프로젝트에 오신 것을 환영합니다.
          </p>
          
          <div className='space-y-4'>
            <Link href="/admin/sign-in">
              <button className='w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 transition duration-200'>
                관리자 로그인
              </button>
            </Link>
            
            <div className='text-sm text-gray-500'>
              관리자 계정으로 로그인하여 시스템을 관리하세요.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
