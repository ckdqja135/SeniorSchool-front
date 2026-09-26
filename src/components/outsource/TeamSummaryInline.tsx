import { TeamComposition } from '@/types/vendor';

interface TeamSummaryInlineProps {
    team: Partial<TeamComposition>;
    compact?: boolean;
}

export default function TeamSummaryInline({
    team,
    compact = false,
}: TeamSummaryInlineProps) {
    if (!team || team.total === 0) return null;

    // 0이 아닌 역할만 필터링
    const roles = [
        { key: 'frontend', label: 'FE', emoji: '👨‍💻', value: team.frontend || 0 },
        { key: 'backend', label: 'BE', emoji: '🧑‍💻', value: team.backend || 0 },
        { key: 'ai', label: 'AI', emoji: '🤖', value: team.ai || 0 },
        { key: 'designer', label: 'Design', emoji: '🎨', value: team.designer || 0 },
        { key: 'pm', label: 'PM', emoji: '📋', value: team.pm || 0 },
        { key: 'devops', label: 'DevOps', emoji: '⚙️', value: team.devops || 0 },
        { key: 'qa', label: 'QA', emoji: '🔍', value: team.qa || 0 },
    ].filter((role) => role.value > 0);

    if (compact) {
        // 축약형: "총 6명 · FE 3 · BE 2"
        const topRoles = roles.slice(0, 3);
        return (
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">총 {team.total}명</span>
                {topRoles.map((role) => (
                    <span key={role.key}>
                        · {role.label} {role.value}
                    </span>
                ))}
            </div>
        );
    }

    // 전체형: "👨‍💻 Front 3 · 🧑‍💻 Back 2 · 🤖 AI 1"
    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-700">총 {team.total}명</span>
            <div className="flex flex-wrap items-center gap-2">
                {roles.map((role, index) => (
                    <span key={role.key} className="flex items-center gap-1 text-gray-600">
                        {index > 0 && <span className="mr-1">·</span>}
                        <span>{role.emoji}</span>
                        <span>
                            {role.label} {role.value}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
