import OutsourceVendorForm from '@/components/outsource/OutsourceVendorForm';

export default function NewVendorPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <OutsourceVendorForm mode="create" />
        </div>
    );
}
