import React from "react";

interface Props {
  children: React.ReactNode;
}

const CommonHeader = ({ children }: Props) => {
  return (
    <header className='fixed flex h-[52px] w-screen items-center justify-center bg-gray-700 text-white'>
      {children}
    </header>
  );
};

export default CommonHeader;
