import CommonHeader from "@/components/common/Header";
import CommonButton from "@/components/common/Button";

interface Props {
  onToggleSidebar?: () => void;
}

const AdminHeader: React.FC<Props> = ({ onToggleSidebar }) => {
  return (
    <CommonHeader>
      <CommonButton
        className='rounded bg-blue-300 p-2 text-white'
        onClick={onToggleSidebar}
      >
        사이드바 토글
      </CommonButton>
      <h1>Admin</h1>
    </CommonHeader>
  );
};

export default AdminHeader;
