import { InputProps } from "@/types";

const CommonInput = ({
  label,
  inputType,
  className,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: InputProps) => {
  return (
    <div className='flex flex-col gap-1'>
      <label className='select-none text-label-medium'>{label}</label>
      <input
        type={inputType}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      {error && (
        <p className='text-caption-medium font-medium text-red-500'>{error}</p>
      )}
    </div>
  );
};

export default CommonInput;
