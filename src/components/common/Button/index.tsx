import { ButtonProps } from "@/types";

const CommonButton = ({ children, onClick, className }: ButtonProps) => {
  return (
    <>
      <button onClick={onClick} className={className}>
        {children}
      </button>
    </>
  );
};

export default CommonButton;
