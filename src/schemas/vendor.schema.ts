/**
 * 외주 업체 정보 Zod 스키마
 */

import { z } from 'zod';
import { VendorCategory, AvgBudgetRange } from '@/types/vendor';

// ========== 유틸리티 함수 ==========

const currentYear = new Date().getFullYear();

// ========== Enum 스키마 ==========

export const vendorCategorySchema = z.nativeEnum(VendorCategory);

export const avgBudgetRangeSchema = z.nativeEnum(AvgBudgetRange);

// ========== 팀 구성 스키마 ==========

export const teamCompositionSchema = z
    .object({
        frontend: z.number().int().min(0).max(50).default(0),
        backend: z.number().int().min(0).max(50).default(0),
        ai: z.number().int().min(0).max(50).default(0),
        designer: z.number().int().min(0).max(50).default(0),
        pm: z.number().int().min(0).max(50).default(0),
        devops: z.number().int().min(0).max(50).default(0),
        qa: z.number().int().min(0).max(50).default(0),
        etc: z.number().int().min(0).max(50).default(0),
        total: z.number().int().min(0),
    })
    .refine(
        (data) => {
            const sum =
                data.frontend +
                data.backend +
                data.ai +
                data.designer +
                data.pm +
                data.devops +
                data.qa +
                data.etc;
            return data.total === sum;
        },
        {
            message: '전체 인원 수는 각 역할별 인원 수의 합과 일치해야 합니다.',
            path: ['total'],
        }
    );

// ========== 정부지원사업 스키마 ==========

export const govSupportSchema = z
    .object({
        hasGovSupportExperience: z.boolean(),
        govSupportPrograms: z
            .array(z.string().min(2).max(50))
            .max(10)
            .optional(),
        govSupportTotalCount: z.number().int().min(1).max(100).optional(),
        govSupportRecentYear: z
            .number()
            .int()
            .min(2000)
            .max(currentYear)
            .optional(),
        govSupportMainTitle: z.string().max(100).optional(),
        govSupportLinks: z.array(z.string().url()).max(3).optional(),
        govSupportSummary: z.string().max(500).optional(),
    })
    .refine(
        (data) => {
            // hasGovSupportExperience가 true이면 govSupportPrograms가 필수
            if (data.hasGovSupportExperience) {
                return (
                    data.govSupportPrograms && data.govSupportPrograms.length > 0
                );
            }
            return true;
        },
        {
            message:
                '정부지원사업 수행 경력이 있는 경우, 수행한 프로그램을 최소 1개 이상 입력해야 합니다.',
            path: ['govSupportPrograms'],
        }
    );

// ========== 개발 분야 전용 스키마 ==========

export const devSpecificSchema = z.object({
    techStackSummary: z.array(z.string().min(2).max(30)).min(1).max(10),
    frontendStacks: z.array(z.string().min(2).max(30)).max(15).optional(),
    backendStacks: z.array(z.string().min(2).max(30)).max(15).optional(),
    aiStacks: z.array(z.string().min(2).max(30)).max(15).optional(),
    mobileStacks: z.array(z.string().min(2).max(30)).max(15).optional(),
    infraStacks: z.array(z.string().min(2).max(30)).max(15).optional(),
    devTags: z.array(z.string().min(2).max(30)).max(10).optional(),
    repoUrls: z.array(z.string().url()).max(5).optional(),
    githubAccount: z.string().max(100).optional(),
    avgDevExperienceYears: z.number().int().min(0).max(30).optional(),
    devProjectTypes: z.array(z.string().min(2).max(50)).max(5).optional(),
    devPreferenceNote: z.string().max(500).optional(),
});

// ========== 공통 필드 스키마 (Base Vendor) ==========

// refine 없는 기본 object 스키마
const baseVendorObjectSchema = z.object({
    id: z.string().optional(),
    name: z
        .string()
        .min(2, '업체명은 최소 2자 이상이어야 합니다.')
        .max(50, '업체명은 최대 50자까지 입력 가능합니다.')
        .regex(
            /^[a-zA-Z0-9가-힣\s\-_.&()]+$/,
            '업체명에 허용되지 않는 특수문자가 포함되어 있습니다.'
        ),
    tagline: z
        .string()
        .min(5, '한 줄 소개는 최소 5자 이상이어야 합니다.')
        .max(80, '한 줄 소개는 최대 80자까지 입력 가능합니다.'),
    category: vendorCategorySchema,
    serviceTypes: z.array(z.string().min(2).max(30)).max(5).optional(),
    description: z.string().max(2000).optional(),
    minBudget: z.number().int().min(0).optional(),
    avgBudget: z.number().int().min(0).optional(),
    maxBudget: z.number().int().min(0).optional(),
    avgBudgetRange: avgBudgetRangeSchema.optional(),
    mainPortfolioUrl: z.string().url().optional().or(z.literal('')),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    region: z.string().max(50).optional(),
    timezone: z.string().max(50).optional(),
    contactEmail: z.string().email('유효한 이메일 주소를 입력해주세요.'),
    contactChannel: z.string().max(100).optional(),
    isPublic: z.boolean().default(true),
    team: teamCompositionSchema.optional(),
    govSupport: govSupportSchema.optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// refine이 적용된 최종 스키마
export const baseVendorSchema = baseVendorObjectSchema
    .refine(
        (data) => {
            // minBudget과 maxBudget이 모두 있을 때 검증
            if (
                data.minBudget !== undefined &&
                data.maxBudget !== undefined
            ) {
                return data.minBudget <= data.maxBudget;
            }
            return true;
        },
        {
            message: '최소 단가는 최대 단가보다 클 수 없습니다.',
            path: ['minBudget'],
        }
    )
    .refine(
        (data) => {
            // avgBudget이 minBudget과 maxBudget 사이에 있는지 검증
            if (data.avgBudget !== undefined) {
                const min = data.minBudget ?? 0;
                const max = data.maxBudget ?? Infinity;
                return data.avgBudget >= min && data.avgBudget <= max;
            }
            return true;
        },
        {
            message: '평균 단가는 최소 단가와 최대 단가 사이여야 합니다.',
            path: ['avgBudget'],
        }
    );

// ========== 개발 분야 외주 업체 스키마 ==========

// refine 없는 기본 스키마를 extend한 후 refine 적용
export const devVendorSchema = baseVendorObjectSchema
    .extend({
        category: z.literal(VendorCategory.DEVELOPMENT),
        devInfo: devSpecificSchema,
        isPublic: z.boolean().default(true),
    })
    .refine(
        (data) => {
            // minBudget과 maxBudget이 모두 있을 때 검증
            if (
                data.minBudget !== undefined &&
                data.maxBudget !== undefined
            ) {
                return data.minBudget <= data.maxBudget;
            }
            return true;
        },
        {
            message: '최소 단가는 최대 단가보다 클 수 없습니다.',
            path: ['minBudget'],
        }
    )
    .refine(
        (data) => {
            // avgBudget이 minBudget과 maxBudget 사이에 있는지 검증
            if (data.avgBudget !== undefined) {
                const min = data.minBudget ?? 0;
                const max = data.maxBudget ?? Infinity;
                return data.avgBudget >= min && data.avgBudget <= max;
            }
            return true;
        },
        {
            message: '평균 단가는 최소 단가와 최대 단가 사이여야 합니다.',
            path: ['avgBudget'],
        }
    );

// ========== 폼 입력용 스키마 (조건부 필드 처리) ==========

/**
 * 외주 업체 등록/수정 폼용 스키마
 * category에 따라 devInfo가 조건부로 required됨
 */
export const vendorFormSchema = z.discriminatedUnion('category', [
    devVendorSchema,
    baseVendorObjectSchema
        .extend({
            category: z.enum([
                VendorCategory.DESIGN,
                VendorCategory.MARKETING,
                VendorCategory.VIDEO,
                VendorCategory.CONSULTING,
            ]),
            isPublic: z.boolean().default(true),
        })
        .refine(
            (data) => {
                // minBudget과 maxBudget이 모두 있을 때 검증
                if (
                    data.minBudget !== undefined &&
                    data.maxBudget !== undefined
                ) {
                    return data.minBudget <= data.maxBudget;
                }
                return true;
            },
            {
                message: '최소 단가는 최대 단가보다 클 수 없습니다.',
                path: ['minBudget'],
            }
        )
        .refine(
            (data) => {
                // avgBudget이 minBudget과 maxBudget 사이에 있는지 검증
                if (data.avgBudget !== undefined) {
                    const min = data.minBudget ?? 0;
                    const max = data.maxBudget ?? Infinity;
                    return data.avgBudget >= min && data.avgBudget <= max;
                }
                return true;
            },
            {
                message: '평균 단가는 최소 단가와 최대 단가 사이여야 합니다.',
                path: ['avgBudget'],
            }
        ),
]);

// ========== 타입 추론 ==========

export type TeamCompositionInput = z.infer<typeof teamCompositionSchema>;
export type GovSupportInput = z.infer<typeof govSupportSchema>;
export type DevSpecificInput = z.infer<typeof devSpecificSchema>;
export type BaseVendorInput = z.infer<typeof baseVendorSchema>;
export type DevVendorInput = z.infer<typeof devVendorSchema>;
export type VendorFormInput = z.infer<typeof vendorFormSchema>;
